import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const generateS2S = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { audioBase64, voice = "alloy" } = req.body;

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!audioBase64) return res.status(400).json({ msg: "Audio required" });

    await checkUsage(userId, "s2s", 1);

    const buffer = Buffer.from(audioBase64, "base64");

    // 1. Convert audio → text
    const transcription = await openai.audio.transcriptions.create({
      file: buffer,
      model: "whisper-1"
    });

    const text = transcription.text;

    // 2. Convert text → audio
    const ttsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini-tts",
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [{ role: "user", content: text }]
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    await addUsage(userId, "s2s", 1);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

    logger.info("S2S generated", { userId });
  } catch (err) {
    logger.error("S2S backend error", err);
    res.status(500).json({ msg: "S2S backend error", error: err.message });
  }
};

export default generateS2S