import express from "express";
import { getSubscription, updateSubscriptionStatus } from "../controllers/subscriptionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { verifyInternalKey } from "../middleware/internalAuth.js";

const router = express.Router();

// 1. User-facing: GET /subscription/me
router.get("/me", authenticate, getSubscription);

// 2. Internal-facing: POST /subscription/internal/update
// Protected by the internal secret key
router.post("/internal/update", verifyInternalKey, updateSubscriptionStatus);

export default router;