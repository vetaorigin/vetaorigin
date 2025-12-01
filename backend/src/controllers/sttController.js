// controllers/sttController.js
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";

const logger = initLogger();

export const speechToText = async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!audioBase64) return res.status(400).json({ msg: "Audio required" });

    // Estimate duration
    const durationSec = audioBase64.length / 10000; // rough estimate
    await checkUsage(userId, "stt", durationSec);

    // Call OpenAI STT
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const response = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "whisper-1",
    });

    await addUsage(userId, "stt", durationSec);

    logger.info("STT successful", { userId });
    res.json({ text: response.text });
  } catch (err) {
    logger.error("STT error", err);
    res.status(500).json({ msg: "Speech-to-text failed", error: err.message });
  }
};
