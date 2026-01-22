// import { openai } from "../config/openaiConfig.js";
// import { checkUsage, addUsage } from "../utils/rateLimiter.js";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// export const generateTTS = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const { text, voice = "alloy" } = req.body;

//     if (!userId) {
//       return res.status(401).json({ msg: "Unauthorized" });
//     }

//     if (!text) {
//       return res.status(400).json({ msg: "Text is required" });
//     }

//     const durationEstimate = Math.ceil(text.length / 10);
//     await checkUsage(userId, "tts", durationEstimate);

//     // ---- CORRECT OPENAI TTS CALL ----
//     const speech = await openai.audio.speech.create({
//       model: "gpt-4o-mini-tts",
//       voice,
//       input: text,
//       format: "mp3"
//     });

//     const buffer = Buffer.from(await speech.arrayBuffer());

//     await addUsage(userId, "tts", durationEstimate);

//     res.setHeader("Content-Type", "audio/mpeg");
//     res.send(buffer);

//     logger.info("TTS generated", { userId });

//   } catch (err) {
//     logger.error("TTS backend error", err);
//     return res.status(500).json({
//       msg: "TTS backend error",
//       error: err.message
//     });
//   }
// };

// export default generateTTS;

import { openai } from "../config/openaiConfig.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const generateTTS = async (req, res) => {
  try {
    // ✅ CHANGE: Get userId from req.user (JWT)
    const userId = req.user?.id;
    const { text, voice = "alloy" } = req.body;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized: Token missing" });
    }

    if (!text) {
      return res.status(400).json({ msg: "Text is required" });
    }

    // 1. Check Usage (Using the 'tts' category from your plans table)
    // We simplify usage tracking to 1 request per call
    await checkUsage(userId, "tts");

    logger.debug("Processing TTS request", { userId, voice });

    // 2. OpenAI TTS Call
    const speech = await openai.audio.speech.create({
      model: "tts-1", // Standard TTS model (gpt-4o-mini handles text, tts-1 handles voice)
      voice,
      input: text,
      response_format: "mp3"
    });

    // 3. Convert response to buffer for transmission
    const buffer = Buffer.from(await speech.arrayBuffer());

    // 4. Record Usage in DB
    await addUsage(userId, "tts");

    // 5. Send Audio stream
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);

    logger.info("TTS generated successfully", { userId });

  } catch (err) {
    // Handle plan limit errors specifically
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }

    logger.error("TTS backend error", err);
    return res.status(500).json({
      msg: "TTS backend error",
      error: err.message
    });
  }
};

export default generateTTS;








