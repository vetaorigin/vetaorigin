// routes/auth.js
import express from "express";
// Added googleLogin and googleCallback to the imports
import { signup, login, logout, me, googleLogin, googleCallback } from "../controllers/authController.js";

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
 * @route POST /auth/logout
 */
router.post("/logout", logout);

/**
 * @route GET /auth/me
 */
router.get("/me", me);

/* ----------------------------------------------------
    NEW GOOGLE OAUTH ROUTES
----------------------------------------------------- */

/**
 * @route GET /auth/google
 * This is the endpoint the frontend hits to start the Google login process
 */
router.get("/google", googleLogin);

/**
 * @route GET /auth/callback
 * Google redirects here after the user logs in
 */
router.get("/callback", googleCallback);

export default router;


// routes/auth.js
// import express from "express";
// import { signup, login, logout, me } from "../controllers/authController.js";

// const router = express.Router();

// /**
//  * @route POST /auth/signup
//  */
// router.post("/signup", signup);

// /**
//  * @route POST /auth/login
//  */
// router.post("/login", login);

// /**
//  * @route POST /auth/logout
//  */
 
// router.post("/logout", logout);
// /**
//  * @route GET /auth/me
//  */
// router.get("/me", me);

// export default router;
