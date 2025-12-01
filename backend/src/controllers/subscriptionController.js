// controllers/subscriptionController.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { TIERS } from "../utils/tiers.js";
import { now } from "../utils/helper.js";

const logger = initLogger();

export const getSubscription = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!sub) return res.json({ subscription: null });

    res.json({ subscription: sub });
  } catch (err) {
    logger.error("Fetch subscription failed", err);
    res.status(500).json({ msg: "Could not fetch subscription", error: err.message });
  }
};

// Renew or create subscription (after payment)
export const upsertSubscription = async (userId, plan, durationDays) => {
  try {
    const expiresAt = now() + durationDays * 24 * 3600;

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        { user_id: userId, plan, expires_at: expiresAt },
        { onConflict: ["user_id"] }
      )
      .select()
      .single();

    if (error) throw error;
    logger.info("Subscription updated", { userId, plan, expiresAt });
    return data;
  } catch (err) {
    logger.error("Upsert subscription failed", err);
    throw err;
  }
};
