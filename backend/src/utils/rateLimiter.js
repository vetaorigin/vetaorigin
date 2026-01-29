// import { now } from "./helper.js";
// import { initLogger } from "./logger.js";
// // ✅ FIX: Import supabaseAdmin to bypass RLS and RPC permission checks
// import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

// const logger = initLogger();
// const VALID_MODES = ["tts", "stt", "s2s", "chat"];

// /**
//  * CHECK USAGE: Validates if a user can perform an action based on their DB plan
//  */
// export async function checkUsage(userId, mode) {
//     try {
//         // 1. Fetch Subscription + Plan limits
//         // Using admin client ensures we can always see the plan data
//         const { data: sub, error: subError } = await supabase
//             .from("subscriptions")
//             .select(`
//                 expires_at,
//                 plans!fk_plan ( 
//                     name,
//                     chat_limit,
//                     tts_limit,
//                     stt_limit,
//                     s2s_limit
//                 )
//             `)
//             .eq("user_id", userId)
//             .maybeSingle();

//         if (subError) {
//             logger.error("DB Fetch Details:", subError); 
//             throw new Error("Subscription fetch failed");
//         }

//         const plan = sub?.plans; 

//         if (!plan) {
//             logger.warn("No plan found for user, using default limits", { userId });
//         }

//         const limits = {
//             chat: plan?.chat_limit ?? 10,
//             tts: plan?.tts_limit ?? 10,
//             stt: plan?.stt_limit ?? 10,
//             s2s: plan?.s2s_limit ?? 10
//         };

//         const limit = limits[mode];

//         // 4. Call the RPC via Admin Client
//         const { data: usageData, error: usageError } = await supabase.rpc("get_daily_usage", {
//             userid: userId,
//             mode_name: mode,
//         });

//         if (usageError) {
//             logger.error("RPC Error Details:", usageError);
//             throw new Error("Unable to fetch usage count");
//         }

//         const used = usageData?.[0]?.daily_count ?? 0;

//         if ((used + 1) > limit) {
//             throw new Error(`Daily ${mode} limit reached (${limit}) for your ${plan?.name || 'free'} plan.`);
//         }

//         return true;
//     } catch (err) {
//         logger.error("checkUsage error", err);
//         throw err;
//     }
// }

// /**
//  * ADD USAGE: Records a single success event
//  * ✅ FIX: Uses supabase (Admin) to ensure the row is inserted regardless of RLS
//  */
// export async function addUsage(userId, mode) {
//     try {
//         const { error } = await supabase.rpc('increment_usage', { 
//             uid: userId, 
//             modename: mode 
//         });
        
//         if (error) {
//             logger.error("RPC Execution failed:", error);
//             throw error;
//         }
        
//         logger.info(`Usage recorded: ${userId} [${mode}]`);
//     } catch (err) {
//         // We log the full error here to catch RLS/Permission issues in Render
//         logger.error("addUsage critical error", { userId, mode, error: err.message });
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

