import bcrypt from "bcryptjs";
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "../services/subscriptionService.js";

const logger = initLogger();
const FREE_PLAN_UUID = "1ef2f7f9-e383-449f-ad4c-965a74789043";

/* ----------------------------------------------------
    SIGNUP
----------------------------------------------------- */
export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ msg: "Missing fields" });

        // 1. Create User in your 'public.users' table
        const hashedPassword = await bcrypt.hash(password, 12);
        const { data: newUser, error: createErr } = await supabase
            .from("users")
            .insert([{ username, email, password: hashedPassword }])
            .select("id, username, email")
            .single();

        if (createErr) {
            if (createErr.code === '23505') return res.status(409).json({ msg: "Email already exists" });
            logger.error("INSERT USER ERROR", createErr);
            return res.status(500).json({ msg: "Error creating user" });
        }

        // 2. Initialize Default Subscription
        const subscriptionData = await upsertSubscription(newUser.id, FREE_PLAN_UUID);

        if (!subscriptionData) { 
            logger.error("SUBSCRIPTION INIT FAILED", { userId: newUser.id });
            return res.status(500).json({ msg: "Error initializing plan" }); 
        }

        // ✅ NO SESSION STORAGE HERE. 
        // Flutter will perform a separate 'signIn' to get the JWT.
        return res.json({ msg: "Account created successfully", user: newUser });

    } catch (err) {
        logger.error("SIGNUP FAILED", err);
        return res.status(500).json({ msg: "Server error", error: err.message });
    }
};

/* ----------------------------------------------------
    LOGIN
----------------------------------------------------- */
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

        if (error || !user) return res.status(401).json({ msg: "Invalid credentials" });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ msg: "Invalid credentials" });

        // ✅ REMOVED req.session.regenerate
        logger.info("User verified on backend", { userId: user.id });

        return res.json({
            msg: "Logged in",
            user: { id: user.id, username: user.username, email: user.email }
            // Note: In production, Flutter should sign in via Supabase Auth 
            // to get a JWT, but this allows your custom table check to pass.
        });

    } catch (err) {
        logger.error("LOGIN FAILED", err);
        return res.status(500).json({ msg: "Server error" });
    }
};

/* ----------------------------------------------------
    LOGOUT
----------------------------------------------------- */
export const logout = async (req, res) => {
    // ✅ In JWT auth, logout is handled by the client (Flutter) 
    // simply by deleting the token from local storage.
    return res.json({ msg: "Logged out (Client-side token removal required)" });
};

/* ----------------------------------------------------
    ME (CURRENT USER)
----------------------------------------------------- */
export const me = async (req, res) => {
    try {
        // ✅ NOW USES req.user.id FROM JWT MIDDLEWARE
        const userId = req.user?.id; 

        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, email")
            .eq("id", userId)
            .maybeSingle();

        if (error || !user) return res.status(404).json({ msg: "User not found" });

        return res.json({ user });

    } catch (err) {
        logger.error("FETCH ME FAILED", err);
        return res.status(500).json({ msg: "Server error" });
    }
};

export default { signup, login, logout, me };


// controllers/authController.js

// import bcrypt from "bcryptjs";
// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// import { handleError } from "../utils/helper.js"; // Assuming this is needed
// import { upsertSubscription } from "../services/subscriptionService.js";

// const logger = initLogger();

// // ----------------------------------------------------
// // THE FREE PLAN UUID — MUST EXIST IN "plans" TABLE
// // ----------------------------------------------------
// const FREE_PLAN_UUID = "1ef2f7f9-e383-449f-ad4c-965a74789043";

// /* ----------------------------------------------------
//     SIGNUP
// ----------------------------------------------------- */
// export const signup = async (req, res) => {
//     try {
//         const { username, email, password } = req.body;
//         if (!username || !email || !password)
//             return res.status(400).json({ msg: "Missing fields" });

//         // Check if user already exists
//         const { data: existing, error: existErr } = await supabase
//             .from("users")
//             .select("id")
//             .eq("email", email)
//             .maybeSingle();

//         if (existErr) {
//             logger.error("CHECK USER ERROR", existErr);
//             return res.status(500).json({ msg: "Server error" });
//         }

//         if (existing) return res.status(409).json({ msg: "Email already exists" });

//         const hashedPassword = await bcrypt.hash(password, 12);

//         // Create user
//         const { error: createErr } = await supabase
//             .from("users")
//             .insert([{ username, email, password: hashedPassword }]);

//         if (createErr) {
//             logger.error("INSERT USER ERROR", createErr);
//             return res.status(500).json({ msg: "Error inserting user record" });
//         }

//         // Fetch new user to get the auto-generated ID
//         const { data: user, error: fetchErr } = await supabase
//             .from("users")
//             .select("id, username, email")
//             .eq("email", email)
//             .maybeSingle();

//         if (fetchErr || !user) {
//             logger.error("FETCH NEW USER ERROR", fetchErr);
//             return res.status(500).json({ msg: "Error fetching new user" });
//         }

//         /* ----------------------------------------------------
//             INSERT DEFAULT FREE SUBSCRIPTION (CRITICAL STEP)
//         ----------------------------------------------------- */
//         const subscriptionData = await upsertSubscription(user.id, FREE_PLAN_UUID);

//         // 🚨 ENSURE SUBSCRIPTION WAS CREATED BEFORE CONTINUING
//         if (!subscriptionData) { 
//             logger.error("SUBSCRIPTION INIT FAILED", { userId: user.id, planId: FREE_PLAN_UUID });
//             // Block user login if plan assignment failed, to prevent the "No subscription" error.
//             return res.status(500).json({ msg: "Registration successful, but subscription failed." }); 
//         }

//         // ------------------------------
//         // Store user session
//         // ------------------------------
//         req.session.userId = user.id;

//         return res.json({ msg: "Account created", user });

//     } catch (err) {
//         logger.error("SIGNUP FAILED", err);
//         return res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// /* ----------------------------------------------------
//     LOGIN (Subscription Check Added)
// ----------------------------------------------------- */
// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         if (!email || !password)
//             return res.status(400).json({ msg: "Missing fields" });

//         const { data: user, error } = await supabase
//             .from("users")
//             .select("*")
//             .eq("email", email)
//             .maybeSingle();

//         if (error) {
//             logger.error("Error fetching user", error);
//             return res.status(500).json({ msg: "Server error" });
//         }

//         if (!user) return res.status(401).json({ msg: "Invalid credentials" });

//         const isValid = await bcrypt.compare(password, user.password);
//         if (!isValid) return res.status(401).json({ msg: "Invalid credentials" });

//         // 🛑 ADD SUBSCRIPTION ASSIGNMENT ON LOGIN
//         // This ensures the user has a Free tier row, even if it was manually deleted or missed earlier.
//         const subscriptionCheck = await upsertSubscription(user.id, FREE_PLAN_UUID);

//         if (!subscriptionCheck) {
//             logger.warn("SUBSCRIPTION CHECK FAILED ON LOGIN. User logged in, but plan not assigned.", { userId: user.id });
//             // Allow login to proceed but log the warning. The user might see a "No active sub" message next.
//         }

//         req.session.regenerate(err => {
//             if (err) {
//                 logger.error("Session regeneration error", err);
//                 return res.status(500).json({ msg: "Error creating session" });
//             }

//             req.session.userId = user.id;

//             logger.info("User logged in", { userId: user.id });

//             return res.json({
//                 msg: "Logged in",
//                 user: { id: user.id, username: user.username, email: user.email }
//             });
//         });

//     } catch (err) {
//         logger.error("LOGIN FAILED", err);
//         return res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// /* ----------------------------------------------------
//     LOGOUT
// ---------------------------------------------------- */
// export const logout = async (req, res) => {
//     try {
//         if (!req.session)
//             return res.status(200).json({ msg: "Logged out" });

//         req.session.destroy(err => {
//             if (err)
//                 return res.status(500).json({ msg: "Logout failed", error: err.message });

//             res.clearCookie("connect.sid");
//             return res.json({ msg: "Logged out successfully" });
//         });

//     } catch (err) {
//         return res.status(500).json({ msg: "Logout error", error: err.message });
//     }
// };

// /* ----------------------------------------------------
//     CURRENT USER
// ---------------------------------------------------- */
// export const me = async (req, res) => {
//     try {
//         if (!req.session?.userId) {
//             logger.warn("Unauthorized access attempt");
//             return res.status(401).json({ msg: "Unauthorized" });
//         }

//         const userId = req.session.userId;

//         const { data: user, error } = await supabase
//             .from("users")
//             .select("id, username, email")
//             .eq("id", userId)
//             .maybeSingle();

//         if (error) {
//             logger.error("Error fetching user", error);
//             return res.status(500).json({ msg: "Server error" });
//         }

//         if (!user) return res.status(404).json({ msg: "User not found" });

//         return res.json({ user });

//     } catch (err) {
//         logger.error("FETCH CURRENT USER FAILED", err);
//         return res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// export default {
//     signup,
//     login,
//     logout,
//     me
// };

























