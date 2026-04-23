import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Recreating __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const executeJavaScript = (jobId, code, input = "") => {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, 'temp');
        
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // Note the .js extension instead of .cpp
        const filePath = path.join(tempDir, `${jobId}.js`);
        const inputPath = path.join(tempDir, `${jobId}.txt`);

        fs.writeFileSync(filePath, code);
        fs.writeFileSync(inputPath, input);

        // Docker command for JavaScript
        // - Using node:18-alpine because it is very small and boots up extremely fast
        // - We pipe the input.txt directly into the node process
        const dockerCmd = `docker run --rm --memory="256m" -v "${tempDir}":/app -w /app node:18-alpine sh -c "node ${jobId}.js < ${jobId}.txt"`;

        console.log(`[Executing Docker]: ${dockerCmd}`);

        exec(dockerCmd, { timeout: 15000 }, (error, stdout, stderr) => {
            // Cleanup physical files
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

            if (error) {
                if (error.killed) return resolve({ status: "error", output: "Time Limit Exceeded (TLE)" });
                return resolve({ status: "error", output: stderr || error.message });
            }

            resolve({ status: "success", output: stdout });
        }); 
    });
};