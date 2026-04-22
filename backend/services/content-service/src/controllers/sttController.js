import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";
import { Readable } from "stream";
import { VoiceModel } from "../models/voiceAction.js"; // Import the model

const logger = initLogger();

export const generateSTT = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { audioBase64, deviceMetadata } = req.body; // Capture device info

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!audioBase64) return res.status(400).json({ msg: "Audio data is required" });

    // 1. Check Usage Limits
    await checkUsage(userId, "stt");

    logger.debug("Processing STT request", { userId });

    // 2. Prepare Buffer for OpenAI
    const buffer = Buffer.from(audioBase64, "base64");
    const stream = Readable.from(buffer);
    stream.path = "audio.wav"; 

    // 3. Send to OpenAI Whisper
    const response = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
    });

    const transcriptionText = response.text;

    // 4. Persistence: Record the Voice Action (Using VoiceModel)
    // We pass deviceMetadata here to maintain consistency with your chat logs
    await VoiceModel.recordAction(userId, "stt", "internal-buffer", transcriptionText, {
        device: deviceMetadata || {}
    });

    // 5. Increment Usage
    await addUsage(userId, "stt");

    // 6. Respond
    res.json({ text: transcriptionText });
    
    logger.info("STT generation successful", { userId });
  } catch (err) {
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }
    logger.error("STT Controller Error", err);
    res.status(500).json({ msg: "STT backend error" });
  }
};

export default generateSTT;