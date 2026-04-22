import express from "express";
import { generateS2S } from "../controllers/s2sController.js";
import { generateTTS } from "../controllers/ttsController.js";
import { generateSTT } from "../controllers/sttController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireSubscription } from "../middleware/subscriptionMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

// S2S Route
router.post("/s2s", requireAuth, requireSubscription, rateLimit("s2s"), generateS2S);

// TTS Route
router.post("/tts", requireAuth, requireSubscription, rateLimit("tts"), generateTTS);

// STT Route
router.post("/stt", requireAuth, requireSubscription, rateLimit("stt"), generateSTT);

export default router;