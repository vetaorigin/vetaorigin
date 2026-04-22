import { supabase } from "../services/supabaseClient.js";

export const requireSubscription = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    // Check if the user has an active subscription in your database
    const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (error || !sub) {
        return res.status(403).json({ msg: "Active subscription required" });
    }

    next();
};