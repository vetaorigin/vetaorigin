import { now } from "./helper.js";
import { initLogger } from "./logger.js";
// Using Admin client to bypass RLS and talk directly to the table
import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

const logger = initLogger();
const VALID_MODES = ["tts", "stt", "s2s", "chat"];

/**
 * CHECK USAGE: Validates if a user can perform an action based on their DB plan
 */
/**
 * CHECK USAGE: Verifies if the user has remaining daily limit.
 * Now handles rollback to Free tier and uses your 30-message target.
 */
export async function checkUsage(userId, mode) {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 1. Fetch Subscription + Plan limits
        const { data: sub, error: subError } = await supabase
            .from("subscriptions")
            .select(`
                expires_at,
                plans ( 
                    name,
                    chat_limit,
                    tts_limit,
                    stt_limit,
                    s2s_limit
                )
            `)
            .eq("user_id", userId)
            .gt("expires_at", now.toISOString()) // Only get ACTIVE subscriptions
            .maybeSingle();

        if (subError) {
            logger.error("Subscription fetch failed", subError);
            throw new Error("Unable to verify subscription");
        }

        let plan = sub?.plans;

        // 2. ROLLBACK LOGIC: If no active sub found, manually fetch the 'Free' plan from DB
        if (!plan) {
            const { data: freePlan } = await supabase
                .from("plans")
                .select("*")
                .eq("name", "Free")
                .single();
            
            plan = freePlan;
            logger.info(`Using Free tier limits for user: ${userId}`);
        }

        // Use the limits from the plan, defaulting to 30 as you requested
        const limits = {
            chat: plan?.chat_limit ?? 30,
            tts: plan?.tts_limit ?? 30,
            stt: plan?.stt_limit ?? 30,
            s2s: plan?.s2s_limit ?? 30
        };

        const limit = limits[mode];

        // 3. Fetch current usage
        const { data: usageData, error: usageError } = await supabase
            .from("usage")
            .select("used, updated_at")
            .eq("user_id", userId)
            .eq("type", mode)
            .maybeSingle();

        if (usageError) throw new Error("Unable to fetch usage count");

        let used = 0;
        if (usageData) {
            const lastUpdate = new Date(usageData.updated_at).toISOString().split('T')[0];
            // If the record is from a previous day, current usage is 0 (Daily Reset)
            used = (lastUpdate === today) ? usageData.used : 0;
        }

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
 * ADD USAGE: Records a single success event with Daily Reset logic.
 */
export async function addUsage(userId, mode) {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 1. Get current count to determine if we reset for the new day
        const { data: usageData } = await supabase
            .from("usage")
            .select("used, updated_at")
            .eq("user_id", userId)
            .eq("type", mode)
            .maybeSingle();

        let newUsed = 1;

        if (usageData && usageData.updated_at) {
            const lastUpdate = new Date(usageData.updated_at).toISOString().split('T')[0];
            if (lastUpdate === today) {
                newUsed = usageData.used + 1;
            }
        }

        // 2. Perform UPSERT
        const { error } = await supabase
            .from('usage')
            .upsert({ 
                user_id: userId, 
                type: mode, 
                used: newUsed, 
                updated_at: now
            }, { 
                onConflict: 'user_id,type' 
            });
        
        if (error) throw error;
        
        logger.info(`Usage recorded: ${userId} [${mode}] -> Daily Total: ${newUsed}`);
    } catch (err) {
        logger.error("addUsage critical error", { userId, mode, error: err.message });
    }
}









// export async function checkUsage(userId, mode) {
//     try {
//         // 1. Fetch Subscription + Plan limits
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

//         // 2. Fetch current usage DIRECTLY from the table (Replaces broken RPC)
//         const { data: usageData, error: usageError } = await supabase
//             .from("usage")
//             .select("used") // Using your actual column name 'used'
//             .eq("user_id", userId)
//             .eq("type", mode)
//             .maybeSingle();

//         if (usageError) {
//             logger.error("Usage fetch failed:", usageError);
//             throw new Error("Unable to fetch usage count");
//         }

//         // Map the result: if no row exists, current usage is 0
//         const used = usageData?.used ?? 0;

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
//  * Replaces the broken 'increment_usage' RPC that was looking for 'count'
//  */
// export async function addUsage(userId, mode) {
//     try {
//         // 1. Get the current count first
//         const { data: usageData } = await supabase
//             .from("usage")
//             .select("used")
//             .eq("user_id", userId)
//             .eq("type", mode)
//             .maybeSingle();

//         const currentUsed = usageData?.used ?? 0;
//         const newUsed = currentUsed + 1;

//         // 2. Perform a direct UPSERT (Insert or Update)
//         const { error } = await supabase
//             .from('usage')
//             .upsert({ 
//                 user_id: userId, 
//                 type: mode, 
//                 used: newUsed, 
//                 updated_at: new Date() // Using your 'updated_at' column
//             }, { 
//                 onConflict: 'user_id,type' 
//             });
        
//         if (error) {
//             logger.error("Direct usage update failed:", error);
//             throw error;
//         }
        
//         logger.info(`Usage recorded: ${userId} [${mode}] -> New Total: ${newUsed}`);
//     } catch (err) {
//         logger.error("addUsage critical error", { userId, mode, error: err.message });
//     }
// }

// export default checkUsage;



