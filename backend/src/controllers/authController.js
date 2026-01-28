import bcrypt from "bcryptjs";
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "../services/subscriptionService.js";

const logger = initLogger();
const FREE_PLAN_UUID = "1ef2f7f9-e383-449f-ad4c-965a74789043";

/* ----------------------------------------------------
    GOOGLE OAUTH INITIALIZATION
----------------------------------------------------- */
export const googleLogin = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Ensure APP_URL is https://vetaorigin-9.onrender.com in Render env
                redirectTo: `${process.env.APP_URL}/api/auth/callback`,
            },
        });

        if (error) return res.status(400).json({ msg: error.message });
        
        // Return the Google URL to the frontend
        return res.json({ url: data.url }); 
    } catch (err) {
        logger.error("GOOGLE AUTH INIT FAILED", err);
        return res.status(500).json({ msg: "Server error" });
    }
};

/* ----------------------------------------------------
    GOOGLE OAUTH CALLBACK HANDLER
----------------------------------------------------- */
export const googleCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) return res.status(400).json({ msg: "No code provided" });

        // 1. Exchange the temporary code for a real session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const session = data.session;
        const user = data.user;

        // 2. Sync with your public.users table (The Profile table)
        // We use upsert so it updates existing users or creates new ones
        const { error: profileErr } = await supabase
            .from("users")
            .upsert({ 
                id: user.id, 
                username: user.user_metadata.full_name || user.email.split('@')[0], 
                email: user.email 
                // Password is left null/empty for OAuth users
            }, { onConflict: 'id' });

        if (profileErr) logger.error("PROFILE UPSERT ERROR", profileErr);

        // 3. Ensure they have a subscription
        await upsertSubscription(user.id, FREE_PLAN_UUID);

        // 4. Redirect to Frontend with the token in the URL
        // Your Flutter/Web app will grab this token from the URL on load
        return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${session.access_token}`);

    } catch (err) {
        logger.error("GOOGLE CALLBACK FAILED", err);
        // Redirect to login page with an error flag
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

        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });

        if (authErr) return res.status(400).json({ msg: authErr.message });

        const userId = authData.user.id;

        const hashedPassword = await bcrypt.hash(password, 12);
        const { data: newUser, error: createErr } = await supabase
            .from("users")
            .insert([{ id: userId, username, email, password: hashedPassword }])
            .select("id, username, email")
            .single();

        if (createErr) {
            logger.error("INSERT USER ERROR", createErr);
            return res.status(500).json({ msg: "Error creating profile" });
        }

        await upsertSubscription(userId, FREE_PLAN_UUID);

        return res.json({ msg: "Account created successfully", user: newUser });

    } catch (err) {
        logger.error("SIGNUP FAILED", err);
        return res.status(500).json({ msg: "Server error" });
    }
};

/* ----------------------------------------------------
    LOGIN (Email/Password)
----------------------------------------------------- */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ msg: "Missing fields" });

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return res.status(401).json({ msg: "Invalid credentials" });

        const { data: profile } = await supabase
            .from("users")
            .select("username")
            .eq("email", email)
            .maybeSingle();

        logger.info("User verified via Supabase Auth", { userId: data.user.id });

        return res.json({
            msg: "Logged in",
            token: data.session.access_token,
            user: { 
                id: data.user.id, 
                username: profile?.username || "user", 
                email: data.user.email 
            }
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
    return res.json({ msg: "Logged out (Client-side token removal required)" });
};

/* ----------------------------------------------------
    ME (CURRENT USER)
----------------------------------------------------- */
export const me = async (req, res) => {
    try {
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

export default { signup, login, logout, me, googleLogin, googleCallback };


// import bcrypt from "bcryptjs";
// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// import { upsertSubscription } from "../services/subscriptionService.js";

// const logger = initLogger();
// const FREE_PLAN_UUID = "1ef2f7f9-e383-449f-ad4c-965a74789043";

// /* ----------------------------------------------------
//     SIGNUP
// ----------------------------------------------------- */
// export const signup = async (req, res) => {
//     try {
//         const { username, email, password } = req.body;
//         if (!username || !email || !password) return res.status(400).json({ msg: "Missing fields" });

//         // 1. Create User in Supabase Auth (The "Security" table)
//         const { data: authData, error: authErr } = await supabase.auth.signUp({
//             email,
//             password,
//             options: { data: { username } }
//         });

//         if (authErr) return res.status(400).json({ msg: authErr.message });

//         const userId = authData.user.id;

//         // 2. Create User in your 'public.users' table (The "Profile" table)
//         // Note: We still hash for your custom table, but Supabase Auth handles its own security
//         const hashedPassword = await bcrypt.hash(password, 12);
//         const { data: newUser, error: createErr } = await supabase
//             .from("users")
//             .insert([{ id: userId, username, email, password: hashedPassword }])
//             .select("id, username, email")
//             .single();

//         if (createErr) {
//             logger.error("INSERT USER ERROR", createErr);
//             return res.status(500).json({ msg: "Error creating profile" });
//         }

//         // 3. Initialize Default Subscription
//         await upsertSubscription(userId, FREE_PLAN_UUID);

//         return res.json({ msg: "Account created successfully", user: newUser });

//     } catch (err) {
//         logger.error("SIGNUP FAILED", err);
//         return res.status(500).json({ msg: "Server error" });
//     }
// };

// /* ----------------------------------------------------
//     LOGIN
// ----------------------------------------------------- */
// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         if (!email || !password) return res.status(400).json({ msg: "Missing fields" });

//         // 1. Sign in via Supabase Auth to get a REAL JWT token
//         const { data, error } = await supabase.auth.signInWithPassword({
//             email,
//             password,
//         });

//         if (error) return res.status(401).json({ msg: "Invalid credentials" });

//         // 2. Fetch the extra data (username) from your custom table
//         const { data: profile } = await supabase
//             .from("users")
//             .select("username")
//             .eq("email", email)
//             .maybeSingle();

//         logger.info("User verified via Supabase Auth", { userId: data.user.id });

//         // 3. RETURN THE TOKEN TO POSTMAN/FLUTTER
//         return res.json({
//             msg: "Logged in",
//             token: data.session.access_token, // <--- THIS IS WHAT YOU NEED
//             user: { 
//                 id: data.user.id, 
//                 username: profile?.username || "user", 
//                 email: data.user.email 
//             }
//         });

//     } catch (err) {
//         logger.error("LOGIN FAILED", err);
//         return res.status(500).json({ msg: "Server error" });
//     }
// };
// /* ----------------------------------------------------
//     LOGOUT
// ----------------------------------------------------- */
// export const logout = async (req, res) => {
//     // ✅ In JWT auth, logout is handled by the client (Flutter) 
//     // simply by deleting the token from local storage.
//     return res.json({ msg: "Logged out (Client-side token removal required)" });
// };

// /* ----------------------------------------------------
//     ME (CURRENT USER)
// ----------------------------------------------------- */
// export const me = async (req, res) => {
//     try {
//         // ✅ NOW USES req.user.id FROM JWT MIDDLEWARE
//         const userId = req.user?.id; 

//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { data: user, error } = await supabase
//             .from("users")
//             .select("id, username, email")
//             .eq("id", userId)
//             .maybeSingle();

//         if (error || !user) return res.status(404).json({ msg: "User not found" });

//         return res.json({ user });

//     } catch (err) {
//         logger.error("FETCH ME FAILED", err);
//         return res.status(500).json({ msg: "Server error" });
//     }
// };

// export default { signup, login, logout, me };

