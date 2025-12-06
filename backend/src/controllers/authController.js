// controllers/authController.js
import bcrypt from "bcryptjs";
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { handleError } from "../utils/helper.js";

const logger = initLogger();

/* ----------------------------------------------------
   SIGNUP
----------------------------------------------------- */
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate
    if (!username || !email || !password)
      return res.status(400).json({ msg: "Missing fields" });

    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      logger.error("CHECK USER ERROR", checkError);
      return res.status(500).json({ msg: "Error checking user" });
    }

    if (existing) {
      return res.status(409).json({ msg: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const { error: insertError } = await supabase
      .from("users")
      .insert([{ username, email, password: hashedPassword }]);

    if (insertError) {
      logger.error("INSERT USER ERROR", insertError);
      return res.status(500).json({ msg: "Error creating user" });
    }

    // Fetch created user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("email", email)
      .maybeSingle();

    if (userError || !user) {
      logger.error("FETCH NEW USER ERROR", userError);
      return res.status(500).json({ msg: "Error fetching new user" });
    }

    // Create session
    req.session.userId = user.id;

    // Initialize usage row
    const { error: usageError } = await supabase
      .from("usage")
      .insert({
        user_id: user.id,
        chat_used: 0,
        tts_used: 0,
        stt_used: 0,
        s2s_used: 0,
        last_reset: new Date()
      });

    if (usageError) {
      logger.error("USAGE INIT ERROR", usageError);
      return res.status(500).json({ msg: "Error initializing usage" });
    }

    // Response
    res.json({
      msg: "Account created",
      user
    });

  } catch (err) {
    logger.error("SIGNUP FAILED", err);
    res.status(500).json({ msg: "Server error", error: err.message });
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

    // Fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) handleError("Error fetching user", error);
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    // Compare password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ msg: "Invalid credentials" });

    // Regenerate session
    req.session.regenerate(err => {
      if (err) handleError("Session regeneration error", err);

      req.session.userId = user.id;

      logger.info("User logged in", { userId: user.id });

      res.json({
        msg: "Logged in",
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });

  } catch (err) {
    logger.error("LOGIN FAILED", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/* ----------------------------------------------------
   LOGOUT
----------------------------------------------------- */

export const logout = async (req, res) => {
  try {
    if (!req.session) {
      return res.status(200).json({ msg: "Logged out" });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ msg: "Logout failed", error: err.message });
      }
      res.clearCookie("connect.sid");
      return res.json({ msg: "Logged out successfully" });
    });
  } catch (err) {
    res.status(500).json({ msg: "Logout error", error: err.message });
  }
};



/* ----------------------------------------------------
   CURRENT USER
----------------------------------------------------- */
export const me = async (req, res) => {
  try {

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", req.session.userId)
      .maybeSingle();

    if (error) handleError("Error fetching user", error);
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user });

  } catch (err) {
    logger.error("FETCH CURRENT USER FAILED", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
