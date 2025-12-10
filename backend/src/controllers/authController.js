// controllers/authController.js
import bcrypt from "bcryptjs";
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { handleError } from "../utils/helper.js";
import { upsertSubscription } from "../services/subscriptionService.js";

const logger = initLogger();

// ----------------------------------------------------
// THE FREE PLAN UUID — MUST EXIST IN "plans" TABLE
// ----------------------------------------------------
const FREE_PLAN_UUID = "003df80b-d242-4182-aff9-0b571aab50c7";

/* ----------------------------------------------------
    SIGNUP
----------------------------------------------------- */
export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ msg: "Missing fields" });

        // Check if user already exists
        const { data: existing, error: existErr } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existErr) {
            logger.error("CHECK USER ERROR", existErr);
            return res.status(500).json({ msg: "Server error" });
        }

        if (existing) return res.status(409).json({ msg: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const { error: createErr } = await supabase
            .from("users")
            .insert([{ username, email, password: hashedPassword }]);

        if (createErr) {
            logger.error("INSERT USER ERROR", createErr);
            return res.status(500).json({ msg: "Error inserting user record" });
        }

        // Fetch new user
        const { data: user, error: fetchErr } = await supabase
            .from("users")
            .select("id, username, email")
            .eq("email", email)
            .maybeSingle();

        if (fetchErr || !user) {
            logger.error("FETCH NEW USER ERROR", fetchErr);
            return res.status(500).json({ msg: "Error fetching new user" });
        }

        /* ----------------------------------------------------
            INSERT DEFAULT FREE SUBSCRIPTION (Application Logic)
        ----------------------------------------------------- */
        const subscriptionData = await upsertSubscription(user.id, FREE_PLAN_UUID);

        // 🚨 CRITICAL FIX: The service returns 'null' on failure, so we check for NOT data.
        if (!subscriptionData) { 
            logger.error("SUBSCRIPTION INIT FAILED", { userId: user.id, planId: FREE_PLAN_UUID });
            // If this fails, the account is created, but the plan isn't assigned, so we error out.
            return res.status(500).json({ msg: "Error creating subscription" }); 
        }

        /* ----------------------------------------------------
            OLD USAGE ROW INSERTION REMAINS REMOVED
        ----------------------------------------------------- */

        // ------------------------------
        // Store user session
        // ------------------------------
        req.session.userId = user.id;

        return res.json({ msg: "Account created", user });

    } catch (err) {
        logger.error("SIGNUP FAILED", err);
        return res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// ----------------------------------------------------
// LOGIN
// ----------------------------------------------------
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ msg: "Missing fields" });

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            logger.error("Error fetching user", error);
            return res.status(500).json({ msg: "Server error" });
        }

        if (!user) return res.status(401).json({ msg: "Invalid credentials" });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ msg: "Invalid credentials" });

        req.session.regenerate(err => {
            if (err) {
                logger.error("Session regeneration error", err);
                return res.status(500).json({ msg: "Error creating session" });
            }

            req.session.userId = user.id;

            logger.info("User logged in", { userId: user.id });

            return res.json({
                msg: "Logged in",
                user: { id: user.id, username: user.username, email: user.email }
            });
        });

    } catch (err) {
        logger.error("LOGIN FAILED", err);
        return res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// ----------------------------------------------------
// LOGOUT
// ----------------------------------------------------
export const logout = async (req, res) => {
    try {
        if (!req.session)
            return res.status(200).json({ msg: "Logged out" });

        req.session.destroy(err => {
            if (err)
                return res.status(500).json({ msg: "Logout failed", error: err.message });

            res.clearCookie("connect.sid");
            return res.json({ msg: "Logged out successfully" });
        });

    } catch (err) {
        return res.status(500).json({ msg: "Logout error", error: err.message });
    }
};

// ----------------------------------------------------
// CURRENT USER
// ----------------------------------------------------
export const me = async (req, res) => {
    try {
        if (!req.session?.userId) {
            logger.warn("Unauthorized access attempt");
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const userId = req.session.userId;

        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, email")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            logger.error("Error fetching user", error);
            return res.status(500).json({ msg: "Server error" });
        }

        if (!user) return res.status(404).json({ msg: "User not found" });

        return res.json({ user });

    } catch (err) {
        logger.error("FETCH CURRENT USER FAILED", err);
        return res.status(500).json({ msg: "Server error", error: err.message });
    }
};

export default {
    signup,
    login,
    logout,
    me
};
