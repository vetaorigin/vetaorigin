import express from "express";
import { translateText } from "../controllers/translateController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireSubscription } from "../middleware/subscriptionMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * POST /translate
 * Body: { text: string, targetLanguage: string, deviceMetadata?: object }
 */
router.post("/", requireAuth, requireSubscription, rateLimit("translate"), translateText);

export default router;