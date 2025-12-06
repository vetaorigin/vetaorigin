//middleware/authMiddleware.js
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Ensures the user is logged in
 */
export const requireAuth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      logger.warn("Unauthorized access attempt");
      return res.status(401).json({ msg: "Unauthorized" });
    }
    next();
  } catch (err) {
    logger.error("Auth middleware error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};




