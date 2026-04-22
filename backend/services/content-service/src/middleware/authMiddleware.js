// src/middleware/authMiddleware.js
import { supabase } from "../services/supabaseClient.js";

export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ msg: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Independent verification with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
        return res.status(401).json({ msg: "Invalid or expired token" });
    }

    // Attach user to request so controllers can use req.user.id
    req.user = data.user;
    next();
};