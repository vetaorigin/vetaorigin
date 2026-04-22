import express from "express";
import { getSubscription } from "../controllers/subscriptionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/me", authenticate, getSubscription); // Protected route
export default router;