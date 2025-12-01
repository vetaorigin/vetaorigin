// controllers/authController.js
import bcrypt from "bcryptjs";
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { handleError } from "../utils/helper.js";

const logger = initLogger();

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ msg: "Missing fields" });

    // Check if email exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (checkError) handleError("Error checking existing user", checkError);
    if (existing) return res.status(409).json({ msg: "Email already exists" });

    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Insert user
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password: hash }])
      .select()
      .single();

    if (error) handleError("Error creating user", error);

    // Set session
    req.session.userId = data.id;

    logger.info("User signed up", { userId: data.id, email });
    res.json({
      msg: "Account created",
      user: { id: data.id, username: data.username, email: data.email },
    });
  } catch (err) {
    logger.error("Signup failed", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: "Missing fields" });

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) handleError("Error fetching user", error);
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ msg: "Invalid credentials" });

    req.session.regenerate((err) => {
      if (err) handleError("Session regeneration error", err);
      req.session.userId = user.id;
      logger.info("User logged in", { userId: user.id, email });
      res.json({
        msg: "Logged in",
        user: { id: user.id, username: user.username, email: user.email },
      });
    });
  } catch (err) {
    logger.error("Login failed", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export const me = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id,username,email")
      .eq("id", req.session.userId)
      .maybeSingle();

    if (error) handleError("Error fetching user", error);
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user });
  } catch (err) {
    logger.error("Fetch current user failed", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
