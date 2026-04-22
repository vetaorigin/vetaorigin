import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { VoiceModel } from "../models/voiceAction.js"; // Import the model

const logger = initLogger();

export const generateS2S = async (req, res) => {
  try {
    const userId = req.user?.id; 
    const { audioBase64, voice = "alloy" } = req.body;

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!audioBase64) return res.status(400).json({ msg: "Audio data is required" });

    // 1. Check Usage Limits
    await checkUsage(userId, "s2s");

    logger.debug("Processing S2S request", { userId });

    // 2. Transcription (Audio to Text)
    // Note: Converting base64 to File object for Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(Buffer.from(audioBase64, "base64"), "input.mp3"),
      model: "whisper-1"
    });

    const text = transcription.text;

    // 3. Generation (Text to Speech-ready Audio)
    const ttsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Or gpt-5.2 as per your setup
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [{ role: "user", content: text }]
    });

    const audioData = ttsResponse.choices[0].message.audio;
    const audioBuffer = Buffer.from(audioData.data, "base64");

    // 4. Persistence: Record the Voice Action (Using VoiceModel)
    // We store 's2s' type and the resulting text transcription
    await VoiceModel.recordAction(userId, "s2s", "internal-buffer", text);

    // 5. Usage & Response
    await addUsage(userId, "s2s");

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

    logger.info("S2S generation successful", { userId });
  } catch (err) {
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }
    logger.error("S2S Controller Error", err);
    res.status(500).json({ msg: "Server error during S2S processing" });
  }
};

// Helper to handle the File/Blob issue with OpenAI SDK
import { toFile } from "openai"; 

export default generateS2S;