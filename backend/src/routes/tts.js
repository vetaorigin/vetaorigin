// routes/tts.js
import express from "express";
import { generateTTS } from "../controllers/ttsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireSubscription } from "../middleware/subscriptionMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * @route POST /tts
 * Protected route with session, subscription check, and rate limiting
 */

router.post("/", requireAuth, requireSubscription, rateLimit("tts"), generateTTS);

export default router;
