
// // utils/rateLimiter.js
// import { now } from "./helper.js";
// import { initLogger } from "./logger.js";
// import { supabase } from "../services/supabaseClient.js";

// const logger = initLogger();

// const ONE_REQUEST = 1;

// /**
//  * Check if the user has remaining usage for a mode.
//  * mode = tts | stt | s2s | chat
//  */
// export async function checkUsage(userId, mode) {
//   try {
//     logger.debug("Checking usage...", { userId, mode });

//     // Fetch subscription + plan limits
//     const { data: sub, error: subError } = await supabase
//       .from("subscriptions")
//       .select(
//         `
//         id,
//         user_id,
//         plan_id,
//         expires_at,
//         plans ( name, tts_limit, stt_limit, s2s_limit, chat_limit )
//       `
//       )
//       .eq("user_id", userId)
//       .single();

//     if (subError) {
//       logger.error("Subscription fetch error", subError);
//       throw new Error("Unable to verify subscription");
//     }

//     // Default limits (free tier)
//     const tier = {
//       ttsLimit: sub?.plans?.tts_limit ?? 10,
//       sttLimit: sub?.plans?.stt_limit ?? 10,
//       s2sLimit: sub?.plans?.s2s_limit ?? 10,
//       chatLimit: sub?.plans?.chat_limit ?? 10,
//     };

//     // Handle expiration
//     if (sub && sub.expires_at < now()) {
//       logger.warn("Subscription expired", { userId });
//       throw new Error("Your subscription has expired");
//     }

//     // Fetch usage row for the specific mode
//     const { data: usage, error: usageError } = await supabase
//       .from("usage")
//       .select("used")
//       .eq("user_id", userId)
//       .eq("type", mode)
//       .maybeSingle();

//     if (usageError && usageError.code !== "PGRST116") {
//       logger.error("Usage fetch error", usageError);
//       throw new Error("Unable to fetch usage");
//     }

//     const used = usage?.used ?? 0;

//     let limit = 0;
//     if (mode === "tts") limit = tier.ttsLimit;
//     if (mode === "stt") limit = tier.sttLimit;
//     if (mode === "s2s") limit = tier.s2sLimit;
//     if (mode === "chat") limit = tier.chatLimit;

//     const nextUsage = used + ONE_REQUEST;

//     if (nextUsage > limit) {
//       logger.warn("User exceeded plan limit", {
//         userId,
//         mode,
//         used,
//         nextUsage,
//         limit,
//       });
//       throw new Error("Usage limit reached for your plan");
//     }

//     logger.info("Usage allowed", { userId, mode, used, limit });
//     return true;
//   } catch (err) {
//     logger.error("checkUsage error", err);
//     throw err;
//   }
// }

// /**
//  * Increment usage count after successful request
//  */
// export async function addUsage(userId, mode) {
//   try {
//     logger.debug("Adding usage...", { userId, mode });

//     const { error } = await supabase.rpc("increment_usage", {
//       userid: userId,
//       fieldname: mode,
//       amount: ONE_REQUEST,
//     });

//     if (error) {
//       logger.error("Usage update error", error);
//       throw new Error("Failed to update usage");
//     }

//     logger.info("Usage updated", { userId, mode });
//   } catch (err) {
//     logger.error("addUsage error", err);
//     throw err;
//   }
// }

// export default checkUsage;

// utils/rateLimiter.js
import { now } from "./helper.js";
import { initLogger } from "./logger.js";
import { supabase } from "../services/supabaseClient.js";

const logger = initLogger();

const VALID_MODES = ["tts", "stt", "s2s", "chat"];
const ONE_REQUEST = 1;

// Default limits (for free users)
const FREE_LIMITS = {
  tts: 10,
  stt: 10,
  s2s: 10,
  chat: 10,
};

export async function checkUsage(userId, mode) {
  try {
    logger.debug("Checking usage...", { userId, mode });

    // 1. Validate mode
    if (!VALID_MODES.includes(mode)) {
      logger.warn("Invalid mode passed to checkUsage", { mode });
      throw new Error("Invalid mode");
    }

    // 2. Fetch subscription (NO LIMIT COLUMNS in your DB)
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      logger.error("Subscription fetch error", subError);
      throw new Error("Unable to verify subscription");
    }

    // 3. Handle expiration
    if (sub && sub.expires_at && sub.expires_at < now()) {
      logger.warn("Subscription expired", { userId });
      throw new Error("Your subscription has expired");
    }

    // 4. Use default limits (you said subscription table has NO limits)
    const limit = FREE_LIMITS[mode];

    // 5. Fetch current usage
    const { data: usage, error: usageError } = await supabase
      .from("usage")
      .select("used")
      .eq("user_id", userId)
      .eq("type", mode)
      .maybeSingle();

    if (usageError && usageError.code !== "PGRST116") {
      logger.error("Usage fetch error", usageError);
      throw new Error("Unable to fetch usage");
    }

    const used = usage?.used ?? 0;
    const nextUsage = used + ONE_REQUEST;

    // 6. Limit check
    if (nextUsage > limit) {
      logger.warn("User exceeded plan limit", {
        userId,
        mode,
        used,
        nextUsage,
        limit,
      });
      throw new Error("Usage limit reached for your plan");
    }

    logger.info("Usage allowed", { userId, mode, used, limit });
    return true;
  } catch (err) {
    logger.error("checkUsage error", err);
    throw err;
  }
}

export async function addUsage(userId, mode) {
  try {
    logger.debug("Adding usage...", { userId, mode });

    if (!VALID_MODES.includes(mode)) {
      throw new Error("Invalid mode");
    }

    const { error } = await supabase.rpc("increment_usage", {
      userid: userId,
      fieldname: mode,
      amount: ONE_REQUEST,
    });

    if (error) {
      logger.error("Usage update error", error);
      throw new Error("Failed to update usage");
    }

    logger.info("Usage updated", { userId, mode });
  } catch (err) {
    logger.error("addUsage error", err);
    throw err;
  }
}

export default checkUsage;


