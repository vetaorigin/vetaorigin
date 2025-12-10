// controllers/subscriptionController.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { TIERS } from "../utils/tiers.js";
import { now } from "../utils/helper.js";

const logger = initLogger();



export const getSubscription = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { data, error } = await supabase
      .from("subscriptions")
      .select(`
        id,
        plan_id,
        expires_at,
        plans (
            name,
            tts_limit,
            stt_limit,
            s2s_limit
        )
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("SUBSCRIPTION FETCH ERROR:", error);
      return res.status(500).json({ msg: "Failed to load subscription" });
    }

    if (!data) return res.status(404).json({ msg: "No subscription found" });

    res.json({ subscription: data });
  } catch (err) {
    console.error("GET SUB ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


// Renew or create subscription (after payment)
export const upsertSubscription = async (userId, plan_id, durationDays) => {
  try {
    const expiresAt = now() + durationDays * 24 * 3600;

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        { user_id: userId, plan_id, expires_at: expiresAt },
        { onConflict: ["user_id"] }
      )
      .select()
      .single();

    if (error) throw error;
    logger.info("Subscription updated", { userId, plan_id, expiresAt });
    return data;
  } catch (err) {
    logger.error("Upsert subscription failed", err);
    throw err;
  }
};
