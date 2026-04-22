import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { TranslationModel } from "../models/translation.js"; // Import the model

const logger = initLogger();

export const translateText = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, targetLanguage, deviceMetadata } = req.body;
    
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!text || !targetLanguage) {
      return res.status(400).json({ msg: "Text and target language are required" });
    }

    // 1. Check Usage
    await checkUsage(userId, "translate");

    logger.debug("Processing translation request", { userId, targetLanguage });

    // 2. OpenAI Translation
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Translate to ${targetLanguage}. Maintain tone.` },
        { role: "user", content: text }
      ],
      temperature: 0.3,
    });

    const translatedText = response.choices[0].message.content;

    // 3. Persistence: Log the translation (Using TranslationModel)
    await TranslationModel.log(userId, text, translatedText, targetLanguage, {
        device: deviceMetadata || {}
    });

    // 4. Record Usage
    await addUsage(userId, "translate");

    // 5. Final Response
    res.json({ translated: translatedText });
    
    logger.info("Translation successful", { userId });

  } catch (err) {
    if (err.message.includes("limit reached")) {
        return res.status(429).json({ msg: err.message });
    }
    logger.error("Translation error", err);
    res.status(500).json({ msg: "Translation failed" });
  }
};

export default translateText;