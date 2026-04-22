import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { handleError } from "../utils/helper.js";
import { UserModel } from "../models/UserModel.js";
import { upsertSubscription } from "../services/subscriptionService.js";

const logger = initLogger();
const FREE_PLAN_UUID = "1ef2f7f9-e383-449f-ad4c-965a74789043";

/* ----------------------------------------------------
    GOOGLE OAUTH INITIALIZATION
----------------------------------------------------- */

export const googleLogin = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${process.env.BACKEND_URL}/auth/callback`
            }
        });

        if (error) throw error;

        return res.redirect(data.url);
    } catch (err) {
        logger.error("GOOGLE_LOGIN_FAILED", { error: err.message });
        return res.status(500).json({ msg: "Google login failed" });
    }
};

export const googleCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).json({ msg: "No code provided" });

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const { session, user } = data;

        // ✅ ALIGNED: Use our new UserModel.upsertUser pattern
        const userProfile = await UserModel.upsertUser({
            id: user.id,
            username: user.user_metadata.full_name || user.email.split('@')[0],
            email: user.email
        });

        await upsertSubscription(user.id, FREE_PLAN_UUID);

        const redirectUrl = process.env.FRONTEND_URL || 'myvetaapp://auth-callback';
        return res.redirect(`${redirectUrl}?token=${session.access_token}`);

    } catch (err) {
        logger.error("GOOGLE_CALLBACK_FAILED", { error: err.message });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

/* ----------------------------------------------------
    SIGNUP (Email/Password)
----------------------------------------------------- */
export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ msg: "Missing fields" });

        // 1. Create Auth & Profile via Model
        const newUser = await UserModel.create({ username, email, password });

        // 2. Initialize Subscription
        try {
            await upsertSubscription(newUser.id, FREE_PLAN_UUID);
        } catch (subErr) {
            logger.error("SUBSCRIPTION_INIT_FAILED", { userId: newUser.id, error: subErr.message });
        }

        return res.json({ msg: "Account created successfully", user: newUser });
    } catch (err) {
        handleError("SIGNUP_FAILED", err, 500);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Authenticate via Model
        const { session, userProfile } = await UserModel.authenticate(email, password);
        
        logger.info("User logged in", { userId: userProfile.id });

        return res.json({
            token: session.access_token,
            user: userProfile
        });
    } catch (err) {
        handleError("LOGIN_FAILED", err, 401);
    }
};

export const me = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "User not found" });
        return res.json({ user });
    } catch (err) {
        handleError("ME_FETCH_FAILED", err, 500);
    }
};

export const logout = async (req, res) => {
    return res.json({ msg: "Logged out (Client-side token removal required)" });
};


export default { signup, login, logout, me, googleLogin, googleCallback };