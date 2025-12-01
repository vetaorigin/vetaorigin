// services/subscriptionService.js
import { supabase } from "./supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { now } from "../utils/helper.js";
import { TIERS } from "../utils/tiers.js";

const logger = initLogger();

/**
 * Fetch subscription for a user
 */
export const getSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    logger.error("Failed to fetch subscription", err);
    throw err;
  }
};

/**
 * Check if subscription is active
 */
export const isActive = async (userId) => {
  const sub = await getSubscription(userId);
  return sub && sub.expires_at > now();
};

/**
 * Check user plan limits
 */
export const getPlanLimits = async (userId) => {
  const sub = await getSubscription(userId);
  if (!sub) return TIERS.basic; // default to basic

  const tier = TIERS[sub.plan] || TIERS.basic;
  return tier;
};

/**
 * Upsert subscription (after payment)
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

    if (error) throw error;
    logger.info("Subscription upserted", { userId, plan, expires_at });
    return data;
  } catch (err) {
    logger.error("Upsert subscription failed", err);
    throw err;
  }
};
