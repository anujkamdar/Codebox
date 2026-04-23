import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Recreating __dirname because it does not exist in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --------------------------------

export const executeCpp = (jobId, code, input = "") => {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, 'temp');
        
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const filePath = path.join(tempDir, `${jobId}.cpp`);
        const inputPath = path.join(tempDir, `${jobId}.txt`);
        const outPath = `${jobId}.out`;

        fs.writeFileSync(filePath, code);
        fs.writeFileSync(inputPath, input);

        const dockerCmd = `docker run --rm --memory="256m" -v "${tempDir}":/app -w /app gcc:latest sh -c "g++ ${jobId}.cpp -o ${outPath} && ./${outPath} < ${jobId}.txt"`;

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