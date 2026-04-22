import { supabase } from "../services/supabaseClient.js";

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: "Missing authorization token" });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ msg: "Invalid or expired token" });
    }

    req.user = data.user; // Attach user object to the request
    next();
};