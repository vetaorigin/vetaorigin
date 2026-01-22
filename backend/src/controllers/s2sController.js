// import { openai } from "../config/openaiConfig.js";
// import { addUsage, checkUsage } from "../utils/rateLimiter.js";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// export const generateS2S = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const { audioBase64, voice = "alloy" } = req.body;

//     if (!userId) return res.status(401).json({ msg: "Unauthorized" });
//     if (!audioBase64) return res.status(400).json({ msg: "Audio required" });

//     await checkUsage(userId, "s2s", 1);

//     const buffer = Buffer.from(audioBase64, "base64");

//     // 1. Convert audio → text
//     const transcription = await openai.audio.transcriptions.create({
//       file: buffer,
//       model: "whisper-1"
//     });

//     const text = transcription.text;

//     // 2. Convert text → audio
//     const ttsResponse = await openai.chat.completions.create({
//       model: "gpt-4o-mini-tts",
//       modalities: ["text", "audio"],
//       audio: { voice, format: "mp3" },
//       messages: [{ role: "user", content: text }]
//     });

//     const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

//     await addUsage(userId, "s2s", 1);

//     res.setHeader("Content-Type", "audio/mpeg");
//     res.send(audioBuffer);

//     logger.info("S2S generated", { userId });
//   } catch (err) {
//     logger.error("S2S backend error", err);
//     res.status(500).json({ msg: "S2S backend error", error: err.message });
//   }
// };

// export default generateS2S



import { openai } from "../config/openaiConfig.js";
import { addUsage, checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const generateS2S = async (req, res) => {
  try {
    // ✅ CHANGE: Get userId from req.user (attached by your JWT middleware)
    const userId = req.user?.id; 
    const { audioBase64, voice = "alloy" } = req.body;

    if (!userId) {
        return res.status(401).json({ msg: "Unauthorized: No user ID found in token" });
    }
    
    if (!audioBase64) {
        return res.status(400).json({ msg: "Audio data is required" });
    }

    // 1. Check Limits (The new logic fetches limits from the 'plans' table)
    await checkUsage(userId, "s2s");

    logger.debug("Processing S2S request", { userId });

    const buffer = Buffer.from(audioBase64, "base64");

    // 2. Transcription (Audio to Text)
    // Note: OpenAI requires a filename/extension even for buffers
    const transcription = await openai.audio.transcriptions.create({
      file: await fetch(audioBase64).then(res => res.blob()), // or use a dedicated buffer helper
      model: "whisper-1"
    });

    const text = transcription.text;

    // 3. Generation (Text to Speech-ready Audio)
    const ttsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [{ role: "user", content: text }]
    });

    const audioData = ttsResponse.choices[0].message.audio;
    const audioBuffer = Buffer.from(audioData.data, "base64");

    // 4. Record Usage
    await addUsage(userId, "s2s");

    // 5. Respond
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

    logger.info("S2S generation successful", { userId });
  } catch (err) {
    // Specific error handling for limits
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }

    logger.error("S2S Controller Error", err);
    res.status(500).json({ msg: "Server error during S2S processing", error: err.message });
  }
};

export default generateS2S;





















