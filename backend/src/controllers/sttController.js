// import { openai } from "../config/openaiConfig.js";
// import { addUsage, checkUsage } from "../utils/rateLimiter.js";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// export const generateSTT = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const { audioBase64 } = req.body; // audio sent from frontend as base64

//     if (!userId) return res.status(401).json({ msg: "Unauthorized" });
//     if (!audioBase64) return res.status(400).json({ msg: "Audio required" });

//     await checkUsage(userId, "stt", 1); // 1 unit per request

//     // Convert Base64 to buffer
//     const buffer = Buffer.from(audioBase64, "base64");

//     // Send audio to OpenAI Whisper (or your chosen model)
//     const response = await openai.audio.transcriptions.create({
//       file: buffer,
//       model: "whisper-1"
//     });

//     await addUsage(userId, "stt", 1);

//     res.json({ text: response.text });
//     logger.info("STT generated", { userId });
//   } catch (err) {
//     logger.error("STT backend error", err);
//     res.status(500).json({ msg: "STT backend error", error: err.message });
//   }
// };

// export default generateSTT


import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";
import { Readable } from "stream";

const logger = initLogger();

export const generateSTT = async (req, res) => {
  try {
    // ✅ CHANGE: Get userId from req.user (JWT)
    const userId = req.user?.id;
    const { audioBase64 } = req.body;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized: No user session found" });
    }
    
    if (!audioBase64) {
      return res.status(400).json({ msg: "Audio data is required" });
    }

    // 1. Check Usage against dynamic DB plan limits
    await checkUsage(userId, "stt");

    logger.debug("Processing STT request", { userId });

    // 2. Convert Base64 to a Buffer
    const buffer = Buffer.from(audioBase64, "base64");

    // 3. Create a Readable stream and add a name for OpenAI's multipart/form-data
    // OpenAI needs a filename property to identify the file type
    const stream = Readable.from(buffer);
    stream.path = "audio.wav"; 

    // 4. Send to OpenAI Whisper
    const response = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
    });

    // 5. Record Usage (Increment counter in DB)
    await addUsage(userId, "stt");

    // 6. Respond with transcription
    res.json({ text: response.text });
    
    logger.info("STT generation successful", { userId });
  } catch (err) {
    // Specifically handle the rate limit error from your rateLimiter.js
    if (err.message.includes("limit reached")) {
      return res.status(429).json({ msg: err.message });
    }

    logger.error("STT Controller Error", err);
    res.status(500).json({ msg: "STT backend error", error: err.message });
  }
};

export default generateSTT;

























