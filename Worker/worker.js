import express from 'express';
import { executeCpp } from './executeCpp.js';
import { executeJavaScript } from './executeJavaScript.js';

const app = express();
app.use(express.json());

app.post('/execute', async (req, res) => {
    const { jobId, language, code, input } = req.body;
    
    console.log(`\n[Worker] Executing Job: ${jobId}`);

    try {
        if (language === 'cpp') {
            const result = await executeCpp(jobId, code, input);
            console.log(`[Worker] Job ${jobId} completed.`);
            return res.status(200).json(result);
        }else if(language === 'javascript'){
            const result = await executeJavaScript(jobId, code, input);
            console.log(`[Worker] Job ${jobId} completed.`);
            return res.status(200).json(result);
        }else {
            return res.status(400).json({ status: "error", output: "Language not supported." });
        }
    } catch (error) {
        console.error(`[Worker Error]:`, error);
        return res.status(500).json({ status: "error", output: "Internal Worker Crash" });
    }
});

app.listen(4000, () => {
    console.log('Internal Execution Worker listening on http://localhost:4000');
});