import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";
import { VoiceModel } from "../models/voiceAction.js"; // Import the model

const logger = initLogger();

export const generateTTS = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, voice = "alloy", deviceMetadata } = req.body;

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!text) return res.status(400).json({ msg: "Text is required" });

    // 1. Check Usage Limits
    await checkUsage(userId, "tts");

    logger.debug("Processing TTS request", { userId, voice });

    // 2. OpenAI TTS Call
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      response_format: "mp3"
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    // 3. Persistence: Record the Voice Action (Using VoiceModel)
    // We store the text input as the 'transcription' for auditing purposes
    await VoiceModel.recordAction(userId, "tts", "internal-buffer", text, {
        device: deviceMetadata || {}
    });

    // 4. Record Usage
    await addUsage(userId, "tts");

    // 5. Send Audio stream
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);

    logger.info("TTS generated successfully", { userId });

  } catch (err) {
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }

    logger.error("TTS backend error", err);
    return res.status(500).json({ msg: "TTS backend error" });
  }
};

export default generateTTS;