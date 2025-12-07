// routes/translate.js
import express from "express";
import { translateText } from "../controllers/translateController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * @route POST /translate
 * Protected route with session and rate limiting
 */
router.post("/", requireAuth, rateLimit("s2s"), translateText);

export default router;
