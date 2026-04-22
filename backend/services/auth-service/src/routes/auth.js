import express from "express";
import { 
    signup, 
    login, 
    logout, 
    me, 
    googleLogin, 
    googleCallback 
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js"; // Recommended

const router = express.Router();

/**
 * @route POST /auth/signup
 */
router.post("/signup", signup);

/** * @route POST /auth/login
 */
router.post("/login", login);

/**
 * @route POST /auth/logout
 */
router.post("/logout", logout);

/**
 * @route GET /auth/me
 * @desc Protected route requiring a valid JWT
 */
router.get("/me", authenticate, me);

/**
 * @route GET /auth/google
 * @desc Initiates Google OAuth
 */
router.get("/google", googleLogin);

/**
 * @route GET /auth/callback
 * @desc Callback route for Google OAuth
 */
router.get("/callback", googleCallback);

export default router;