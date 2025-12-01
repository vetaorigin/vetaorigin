// models/subscriptionModel.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { now } from "../utils/helper.js";

const logger = initLogger();

/**
 * Fetch subscription by user ID
 */
export const getSubscriptionByUserId = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error("Failed to fetch subscription", { userId, error });
      throw error;
    }

    return data;
  } catch (err) {
    logger.error("getSubscriptionByUserId error", err);
    throw err;
  }
};

/**
 * Create or update subscription (upsert)
 */
export const upsertSubscription = async (userId, plan, durationDays) => {
  try {
    const expires_at = now() + durationDays * 24 * 3600;

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        { user_id: userId, plan, expires_at },
        { onConflict: ["user_id"] }
      )
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Failed to upsert subscription", { userId, plan, error });
      throw error;
    }

    return data;
  } catch (err) {
    logger.error("upsertSubscription error", err);
    throw err;
  }
};

/**
 * Check if subscription is active
 */
export const isSubscriptionActive = async (userId) => {
  const sub = await getSubscriptionByUserId(userId);
  return sub && sub.expires_at > now();
};
