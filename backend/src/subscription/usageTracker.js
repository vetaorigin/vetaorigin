// subscription/usageTracker.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * VALID USAGE TYPES
 */
const VALID_TYPES = ["chat", "tts", "stt", "s2s"];

/**
 * Fetch usage for a specific type
 */
export const getUsage = async (userId, type) => {
  try {
    if (!VALID_TYPES.includes(type)) throw new Error(`Invalid usage type: ${type}`);

    const column = `${type}_used`;

    const { data, error } = await supabase
      .from("usage")
      .select(column)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return data ? data[column] ?? 0 : 0;
  } catch (err) {
    logger.error("getUsage failed", err);
    throw err;
  }
};

/**
 * Increment usage count for a specific type
 */
export const addUsage = async (userId, type, amount = 1) => {
  try {
    if (!VALID_TYPES.includes(type)) throw new Error(`Invalid usage type: ${type}`);

    const column = `${type}_used`;

    // get current amount
    const current = await getUsage(userId, type);
    const newUsed = current + amount;

    const { data, error } = await supabase
      .from("usage")
      .upsert(
        { user_id: userId, [column]: newUsed },
        { onConflict: "user_id" }
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
 * Reset all usage values (start of billing cycle)
 */
export const resetUsage = async (userId) => {
  try {
    const { error } = await supabase
      .from("usage")
      .update({
        chat_used: 0,
        tts_used: 0,
        stt_used: 0,
        s2s_used: 0
      })
      .eq("user_id", userId);

    if (error) throw error;

    logger.info("Usage reset", { userId });
  } catch (err) {
    logger.error("resetUsage failed", err);
    throw err;
  }
};
