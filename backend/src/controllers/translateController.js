// controllers/translateController.js
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";

const logger = initLogger();

export const translateText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!text || !targetLanguage)
      return res.status(400).json({ msg: "Text and target language required" });

    await checkUsage(userId, "s2s", text.length / 5);

    const prompt = `Translate the following text to ${targetLanguage}: ${text}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    await addUsage(userId, "s2s", text.length / 5);

    const translated = response.choices[0].message.content;
    logger.info("Translation successful", { userId });
    res.json({ translated });
  } catch (err) {
    logger.error("Translation error", err);
    res.status(500).json({ msg: "Translation failed", error: err.message });
  }
};
