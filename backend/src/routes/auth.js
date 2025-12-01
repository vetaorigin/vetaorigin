// routes/auth.js
import express from "express";
import { signup, login, me } from "../controllers/authController.js";

const router = express.Router();

/**
 * @route POST /auth/signup
 */
router.post("/signup", signup);

/**
 * @route POST /auth/login
 */
router.post("/login", login);

/**
 * @route GET /auth/me
 */
router.get("/me", me);

export default router;
