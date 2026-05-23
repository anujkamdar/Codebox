import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = '/tmp/coderunner';
const TIME_LIMIT = 5;
const MEMORY_LIMIT = '128m';

export async function executeCpp(jobId, code, input = '') {
    const jobDir = path.join(TEMP_DIR, jobId);

    fs.mkdirSync(jobDir, { recursive: true });
    fs.writeFileSync(path.join(jobDir, 'main.cpp'), code);
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
            '--name', `cpp-${jobId}`,
            '--network', 'none',
            '--memory', MEMORY_LIMIT,
            '--cpus', '0.5',
            '--tmpfs', '/tmp:rw,nosuid,exec,size=64m', // Added 'exec' here
            '--ulimit', 'nproc=50:50',
            '--ulimit', 'fsize=10000000',
            '-v', `${jobDir}:/code:ro`,
            'gcc:14',
            '/bin/sh', '-c',
            `g++ -O2 -o /tmp/main /code/main.cpp 2>/tmp/ce.txt \
            && timeout ${TIME_LIMIT} /tmp/main < /code/input.txt \
            || (cat /tmp/ce.txt >&2 && exit 1)`,
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => {
            stdout += d.toString();
            if (stdout.length > 100_000) proc.kill();
        });

        proc.stderr.on('data', (d) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            const execTime = Date.now() - startTime;

            if (code === 124) {
                return resolve({ status: 'error', output: 'Time limit exceeded', execTime });
            }
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