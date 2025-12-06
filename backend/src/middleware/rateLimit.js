// middleware/ratelimit.js
import { checkUsage } from "../utils/rateLimiter.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Middleware to check if user has enough quota for the operation
 * @param {"tts"|"stt"|"s2s"|"chat"} mode
 */
export const rateLimit = (mode) => {
  return async (req, res, next) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ msg: "Unauthorized" });

      // Estimate duration if text exists
      let duration = 1; // default
      if (mode === "tts" || mode === "s2s") {
        const text = req.body.text;
        if (!text) return res.status(400).json({ msg: "Text required" });
        duration = text.length / 5; // rough estimate
      } else if (mode === "stt") {
        const audioBase64 = req.body.audioBase64;
        if (!audioBase64) return res.status(400).json({ msg: "Audio required" });
        duration = audioBase64.length / 10000; // rough estimate
      }

      await checkUsage(userId, mode, duration);
      next();
    } catch (err) {
      logger.warn("Rate limit exceeded or error", err);
      res.status(429).json({ msg: err.message });
    }
  };
};
