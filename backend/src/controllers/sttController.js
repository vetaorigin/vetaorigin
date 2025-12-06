import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const generateSTT = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { audioBase64 } = req.body; // audio sent from frontend as base64

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!audioBase64) return res.status(400).json({ msg: "Audio required" });

    await checkUsage(userId, "stt", 1); // 1 unit per request

    // Convert Base64 to buffer
    const buffer = Buffer.from(audioBase64, "base64");

    // Send audio to OpenAI Whisper (or your chosen model)
    const response = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1"
    });

    await addUsage(userId, "stt", 1);

    res.json({ text: response.text });
    logger.info("STT generated", { userId });
  } catch (err) {
    logger.error("STT backend error", err);
    res.status(500).json({ msg: "STT backend error", error: err.message });
  }
};

export default generateSTT