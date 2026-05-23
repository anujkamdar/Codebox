import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { asyncHandler } from "./utils/asynchandler.js";
import crypto from "crypto";


const submitCode = asyncHandler(async (req, res) => {
  const { language, code, input = ""} = req.body;

  if (!language) {
    throw new ApiError(400, "Language is required");
  }

  if (!code) {
    throw new ApiError(400, "Code is required");
  }

  const jobId = crypto.randomUUID();
  console.log(`[API] Received Job: ${jobId}. Forwarding to Worker...`);

  const WORKER_URL = "http://worker:4000/execute";

  try {
    const workerResponse = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, language, code, input }),
    });

    const result = await workerResponse.json();
    console.log(`[API] Job ${jobId} finished.`);
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Execution successful"));
  } catch (error) {
    throw new ApiError(500, "Execution Engine is currently unavailable.");
  }
});

export { submitCode };
