// subscription/usageTracker.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Get current usage for a user by type ('tts', 'stt', 's2s')
 */
export const getUsage = async (userId, type) => {
  try {
    const { data, error } = await supabase
      .from("usage")
      .select(`${type}_used`)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? data[`${type}_used`] : 0;
  } catch (err) {
    logger.error("getUsage failed", err);
    throw err;
  }
};

/**
 * Increment usage
 */
export const addUsage = async (userId, type, amount) => {
  try {
    const current = await getUsage(userId, type);
    const newUsed = current + amount;

    const { data, error } = await supabase
      .from("usage")
      .upsert(
        { user_id: userId, [`${type}_used`]: newUsed },
        { onConflict: ["user_id"] }
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    logger.info("Usage updated", { userId, type, used: newUsed });
    return data;
  } catch (err) {
    logger.error("addUsage failed", err);
    throw err;
  }
};

/**
 * Reset usage at the start of a new billing cycle
 */
export const resetUsage = async (userId) => {
  try {
    const { error } = await supabase
      .from("usage")
      .update({ tts_used: 0, stt_used: 0, s2s_used: 0 })
      .eq("user_id", userId);

    if (error) throw error;
    logger.info("Usage reset", { userId });
  } catch (err) {
    logger.error("resetUsage failed", err);
    throw err;
  }
};
