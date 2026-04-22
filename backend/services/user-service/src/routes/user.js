import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import { getPreferences, updatePreference } from "../controllers/preferenceController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * PROFILE ROUTES
 * Access: Public (Get) / Private (Update)
 */
router.get("/profile/:userId", getProfile);
router.put("/profile/me", authenticate, updateProfile);

/**
 * PREFERENCE ROUTES
 * Access: Private (All routes)
 */
router.get("/preferences", authenticate, getPreferences);
router.put("/preferences/:key", authenticate, updatePreference);

export default router;