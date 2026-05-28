import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = '/tmp/coderunner';
const TIME_LIMIT = 5;
const MEMORY_LIMIT = '512m';

export async function executePython(jobId, code, input = '') {
    const jobDir = path.join(TEMP_DIR, jobId);

    fs.mkdirSync(jobDir, { recursive: true });
    fs.writeFileSync(path.join(jobDir, 'main.py'), code);
    fs.writeFileSync(path.join(jobDir, 'input.txt'), input);

    try {
        return await runInDocker(jobId, jobDir);
    } finally {
        fs.rmSync(jobDir, { recursive: true, force: true });
    }
}

function runInDocker(jobId, jobDir) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const proc = spawn('docker', [
            'run', '--rm',
            '--name', `py-${jobId}`,
            '--network', 'none',
            '--memory', MEMORY_LIMIT,
            '--cpus', '0.5',
            '--ulimit', 'nproc=50:50',
            '--ulimit', 'fsize=10000000',
            '-v', `${jobDir}:/code:ro`,
            'python:3-alpine', // Using Alpine Linux for extremely fast spin-up
            '/bin/sh', '-c',
            `timeout ${TIME_LIMIT} python /code/main.py < /code/input.txt`
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => {
            stdout += d.toString();
            if (stdout.length > 100_000) proc.kill(); // Prevents memory exhaustion from massive output
        });

        proc.stderr.on('data', (d) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            const execTime = Date.now() - startTime;

            // 124 is the standard exit code for the 'timeout' command
            if (code === 124) {
                return resolve({ status: 'error', output: 'Time limit exceeded', execTime });
            }
            
            // If the script crashed (SyntaxError, IndentationError, etc.)
            if (code !== 0 && stderr && !stdout) {
                return resolve({ status: 'error', output: stderr.trim(), execTime });
            }

            resolve({
                status: code === 0 ? 'success' : 'error',
                output: stdout.trim() || stderr.trim(),
                execTime
            });
        });

        proc.on('error', (err) => {
            resolve({ status: 'error', output: err.message, execTime: Date.now() - startTime });
        });
    });
}