// // controllers/translateController.js
// import { openai } from "../config/openaiConfig.js";
// import { initLogger } from "../utils/logger.js";
// import { checkUsage, addUsage } from "../utils/rateLimiter.js";

// const logger = initLogger();

// export const translateText = async (req, res) => {
//   try {
//     const { text, targetLanguage } = req.body;
//     const userId = req.session.userId;
//     if (!userId) return res.status(401).json({ msg: "Unauthorized" });
//     if (!text || !targetLanguage)
//       return res.status(400).json({ msg: "Text and target language required" });

//     await checkUsage(userId, "s2s", text.length / 5);

//     const prompt = `Translate the following text to ${targetLanguage}: ${text}`;
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     await addUsage(userId, "s2s", text.length / 5);

//     const translated = response.choices[0].message.content;
//     logger.info("Translation successful", { userId });
//     res.json({ translated });
//   } catch (err) {
//     logger.error("Translation error", err);
//     res.status(500).json({ msg: "Translation failed", error: err.message });
//   }
// };




import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";

const logger = initLogger();

export const translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    // ✅ CHANGE: Use JWT userId from req.user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized: Token missing or invalid" });
    }

    if (!text || !targetLanguage) {
      return res.status(400).json({ msg: "Text and target language are required" });
    }

    // ✅ CHANGE: Check limits using the 's2s' or 'chat' category.
    // I'm using 's2s' here to match your previous code, but simplified to 1 unit per request.
    await checkUsage(userId, "s2s");

    logger.debug("Processing translation request", { userId, targetLanguage });

    // System prompt for better translation accuracy
    const messages = [
      { 
        role: "system", 
        content: `You are a professional translator. Translate the user's text to ${targetLanguage} accurately while maintaining the original tone.` 
      },
      { 
        role: "user", 
        content: text 
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.3, // Lower temperature for more accurate, less "creative" translations
    });

    // ✅ CHANGE: Record usage in DB
    await addUsage(userId, "s2s");

    const translated = response.choices[0].message.content;
    
    logger.info("Translation successful", { userId });
    res.json({ translated });

  } catch (err) {
    // Handle plan limit errors specifically
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }

    logger.error("Translation error", err);
    res.status(500).json({ msg: "Translation failed", error: err.message });
  }
};

export default translateText;

























