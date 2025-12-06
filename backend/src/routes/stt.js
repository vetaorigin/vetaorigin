// routes/stt.js
import express from "express";
import { generateSTT } from "../controllers/sttController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { rateLimit } from "../middleware/ratelimit.js";

const router = express.Router();

/**
 * @route POST /stt
 * Protected route with session and rate limiting
 */
router.post("/", requireAuth, rateLimit("stt"), generateSTT);

export default router;
