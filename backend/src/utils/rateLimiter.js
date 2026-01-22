// // utils/rateLimiter.js
// import { now } from "./helper.js";
// import { initLogger } from "./logger.js";
// import { supabase } from "../services/supabaseClient.js";

// const logger = initLogger();

// const VALID_MODES = ["tts", "stt", "s2s", "chat"];
// const ONE_REQUEST = 1;

// // Default limits (for free users)
// const FREE_LIMITS = {
//     tts: 10,
//     stt: 10,
//     s2s: 10,
//     chat: 10,
// };

// // -----------------------------------------------------------
// // CHECK USAGE: Uses RPC to get rolling 24-hour count
// // -----------------------------------------------------------
// export async function checkUsage(userId, mode) {
//     try {
//         logger.debug("Checking usage...", { userId, mode });

//         // 1. Validate mode
//         if (!VALID_MODES.includes(mode)) {
//             logger.warn("Invalid mode passed to checkUsage", { mode });
//             throw new Error("Invalid mode");
//         }

//         // 2. Fetch subscription
//         const { data: sub, error: subError } = await supabase
//             .from("subscriptions")
//             .select("id, user_id, plan_id, expires_at")
//             .eq("user_id", userId)
//             .maybeSingle();

//         if (subError) {
//             logger.error("Subscription fetch error", subError);
//             throw new Error("Unable to verify subscription");
//         }

//         // 3. Handle expiration
//         if (sub && sub.expires_at && sub.expires_at < now()) {
//             logger.warn("Subscription expired", { userId });
//             throw new Error("Your subscription has expired");
//         }

//         // 4. Get the limit (using default for free tier)
//         const limit = FREE_LIMITS[mode];

//         // 5. Fetch current usage (ROLLING 24-HOUR COUNT via RPC)
//         const { data: usageData, error: usageError } = await supabase.rpc("get_daily_usage", {
//             userid: userId,
//             mode_name: mode,
//         }).single(); 

//         if (usageError) {
//             logger.error("RPC get_daily_usage error", usageError);
//             throw new Error("Unable to fetch usage count");
//         }

//         const used = usageData?.daily_count ?? 0;
//         const nextUsage = used + ONE_REQUEST;

//         // 6. Limit check
//         if (nextUsage > limit) {
//             logger.warn("User exceeded daily plan limit", {
//                 userId,
//                 mode,
//                 used,
//                 nextUsage,
//                 limit,
//             });
//             throw new Error("Usage limit reached for your plan");
//         }

//         logger.info("Usage allowed", { userId, mode, used, limit });
//         return true;
//     } catch (err) {
//         logger.error("checkUsage error", err);
//         throw err;
//     }
// }

// // -----------------------------------------------------------
// // ADD USAGE: Inserts a single usage event (log)
// // -----------------------------------------------------------
// export async function addUsage(userId, mode) {
//     try {
//         logger.debug("Recording usage event...", { userId, mode });

//         if (!VALID_MODES.includes(mode)) {
//             throw new Error("Invalid mode");
//         }

//         // This inserts a new row; the created_at column handles the timestamp for the 24hr refresh.
//         const { error } = await supabase
//             .from("usage")
//             .insert([
//                 { 
//                     user_id: userId, 
//                     type: mode, 
//                     used: ONE_REQUEST 
//                 } 
//             ]);

//         if (error) {
//             logger.error("Usage insertion error", error);
//             throw new Error("Failed to record usage event");
//         }

//         logger.info("Usage event recorded", { userId, mode });
//     } catch (err) {
//         logger.error("addUsage error", err);
//         throw err;
//     }
// }

// export default checkUsage;





import { now } from "./helper.js";
import { initLogger } from "./logger.js";
import { supabase } from "../services/supabaseClient.js";

const logger = initLogger();
const VALID_MODES = ["tts", "stt", "s2s", "chat"];

/**
 * CHECK USAGE: Validates if a user can perform an action based on their DB plan
 */
export async function checkUsage(userId, mode) {
    try {
        // 1. Fetch Subscription + Plan limits
      // 1. Fetch Subscription + Plan limits
const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select(`
        expires_at,
        plans!fk_plan ( 
            name,
            chat_limit,
            tts_limit,
            stt_limit,
            s2s_limit
        )
    `)
    .eq("user_id", userId)
    .maybeSingle();

if (subError) {
    // Log the specific database error to see exactly why it's failing
    logger.error("DB Fetch Details:", subError); 
    throw new Error("Subscription fetch failed");
}

// 2. Extract the plan data carefully
// Note: Even with !fk_plan, Supabase usually returns the key as 'plans'
const plan = sub?.plans; 

if (!plan) {
    logger.warn("No plan found for user, using default limits", { userId });
}

const limits = {
    chat: plan?.chat_limit ?? 10, // Your fallback defaults
    tts: plan?.tts_limit ?? 10,
    stt: plan?.stt_limit ?? 10,
    s2s: plan?.s2s_limit ?? 10
};

        const limit = limits[mode];

        // 4. Call the CLEANED RPC
        const { data: usageData, error: usageError } = await supabase.rpc("get_daily_usage", {
            userid: userId,
            mode_name: mode,
        });

        if (usageError) {
            console.error("RPC Error Details:", usageError);
            throw new Error("Unable to fetch usage count");
        }

        const used = usageData?.[0]?.daily_count ?? 0;

        if ((used + 1) > limit) {
            throw new Error(`Daily ${mode} limit reached (${limit}) for your ${plan?.name || 'free'} plan.`);
        }

        return true;
    } catch (err) {
        logger.error("checkUsage error", err);
        throw err;
    }
}

/**
 * ADD USAGE: Records a single success event
 */
export async function addUsage(userId, mode) {
    try {
        const { error } = await supabase.rpc('increment_usage', { 
            uid: userId, 
            modename: mode 
        });
        if (error) throw error;
        logger.info(`Usage recorded: ${userId} [${mode}]`);
    } catch (err) {
        logger.error("addUsage error", err);
    }
}

export default checkUsage;























