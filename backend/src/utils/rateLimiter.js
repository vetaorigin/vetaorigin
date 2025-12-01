// utils/rateLimiter.js
import { TIERS } from "./tiers.js";
import { now } from "./helper.js";
import { initLogger } from "./logger.js";
import { supabase } from "../services/supabaseClient.js";

const logger = initLogger();

/**
 * Check if user can perform a TTS/STT/S2S operation
 * @param {string} userId
 * @param {"tts"|"stt"|"s2s"} mode
 * @param {number} duration - duration in seconds
 */
export async function checkUsage(userId, mode, duration) {
  try {
    logger.debug("Checking usage...", { userId, mode, duration });

    // 1️⃣ Get subscription
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (subError) {
      logger.error("Subscription fetch error", subError);
      throw new Error("Unable to verify subscription");
    }

    const tier = TIERS[sub?.plan || "free"];

    // 2️⃣ Check expiration
    if (sub && sub.expires_at < now()) {
      logger.warn("Subscription expired", { userId, sub });
      throw new Error("Your subscription has expired");
    }

    // 3️⃣ Fetch usage row
    const { data: usage, error: usageError } = await supabase
      .from("usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (usageError) {
      logger.error("Usage fetch error", usageError);
      throw new Error("Unable to fetch usage");
    }

    const current = usage || { tts_used: 0, stt_used: 0, s2s_used: 0 };

    let used = 0;
    let limit = 0;

    switch (mode) {
      case "tts":
        used = current.tts_used;
        limit = tier.ttsLimit;
        break;
      case "stt":
        used = current.stt_used;
        limit = tier.sttLimit;
        break;
      case "s2s":
        used = current.s2s_used;
        limit = tier.s2sLimit;
        break;
      default:
        throw new Error("Invalid mode");
    }

    // 4️⃣ Check if user exceeded their limit
    if (used + duration > limit) {
      logger.warn("Usage limit reached", { userId, mode, used, duration, limit });
      throw new Error("Usage limit reached for your plan");
    }

    logger.info("Usage OK", { userId, mode, used, duration, limit });
    return true;
  } catch (err) {
    logger.error("checkUsage error", err);
    throw err;
  }
}

/**
 * Add usage to user record after successful operation
 * @param {string} userId
 * @param {"tts"|"stt"|"s2s"} mode
 * @param {number} duration
 */
export async function addUsage(userId, mode, duration) {
  try {
    const field =
      mode === "tts"
        ? "tts_used"
        : mode === "stt"
        ? "stt_used"
        : "s2s_used";

    const { error } = await supabase.rpc("increment_usage", {
      userid: userId,
      fieldname: field,
      amount: duration,
    });

    if (error) {
      logger.error("Usage update error", error);
      throw new Error("Failed incrementing usage");
    }

    logger.info("Usage updated", { userId, mode, duration });
  } catch (err) {
    logger.error("addUsage error", err);
    throw err;
  }
}
