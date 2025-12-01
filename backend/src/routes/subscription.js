// routes/subscription.js
import express from "express";
import { getSubscription } from "../controllers/subscriptionController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route GET /subscription
 * Returns user's subscription info
 */
router.get("/", requireAuth, getSubscription);

export default router;
