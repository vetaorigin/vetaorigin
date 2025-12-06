import express from "express";
import { generateS2S } from "../controllers/s2sController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireSubscription } from "../middleware/subscriptionMiddleware.js";
import { rateLimit } from "../middleware/ratelimit.js";

const router = express.Router();

router.post("/", requireAuth, requireSubscription, rateLimit("s2s"), generateS2S);

export default router;
