import { openai } from "../config/openaiConfig.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const generateTTS = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { text, voice = "alloy" } = req.body;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    if (!text) {
      return res.status(400).json({ msg: "Text is required" });
    }

    const durationEstimate = Math.ceil(text.length / 10);
    await checkUsage(userId, "tts", durationEstimate);

    // ---- CORRECT OPENAI TTS CALL ----
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      format: "mp3"
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    await addUsage(userId, "tts", durationEstimate);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);

    logger.info("TTS generated", { userId });

  } catch (err) {
    logger.error("TTS backend error", err);
    return res.status(500).json({
      msg: "TTS backend error",
      error: err.message
    });
  }
};

export default generateTTS;
