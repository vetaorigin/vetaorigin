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

        // 1. Fetch Subscription ONLY (No Join)
        const { data: sub, error: subError } = await supabase
            .from("subscriptions")
            .select("plan_id, expires_at")
            .eq("user_id", userId)
            .gt("expires_at", now.toISOString())
            .maybeSingle();

        if (subError) {
            console.error("DEBUG: Sub Fetch Error:", subError);
            throw new Error("Subscription check failed at DB level");
        }

        // 2. Determine which plan to use
        let plan;
        if (sub && sub.plan_id) {
            // Get the paid plan
            const { data: paidPlan } = await supabase
                .from("plans")
                .select("*")
                .eq("id", sub.plan_id)
                .single();
            plan = paidPlan;
        } 

        // ROLLBACK: If no paid plan found, get the Free plan
        if (!plan) {
            const { data: freePlan, error: freeErr } = await supabase
                .from("plans")
                .select("*")
                .eq("name", "Free")
                .single();
            
            if (freeErr) {
                console.error("DEBUG: Free Plan Missing:", freeErr);
                throw new Error("System Error: Free plan not found in database.");
            }
            plan = freePlan;
        }

        // 3. Set the limits (Defaulting to 30 as per your new rules)
        const limits = {
            chat: plan?.chat_limit ?? 30,
            tts: plan?.tts_limit ?? 30,
            stt: plan?.stt_limit ?? 30,
            s2s: plan?.s2s_limit ?? 30
        };
        const limit = limits[mode];

        // 4. Check Usage
        const { data: usageData, error: usageError } = await supabase
            .from("usage")
            .select("used, updated_at")
            .eq("user_id", userId)
            .eq("type", mode)
            .maybeSingle();

        if (usageError) throw new Error("Usage fetch failed");

        let used = 0;
        if (usageData && usageData.updated_at) {
            const lastUpdate = new Date(usageData.updated_at).toISOString().split('T')[0];
            used = (lastUpdate === today) ? usageData.used : 0;
        }

        if ((used + 1) > limit) {
            throw new Error(`Limit reached: ${limit} daily messages for ${plan.name} plan.`);
        }

        return true;
    } catch (err) {
        logger.error("checkUsage critical failure", err);
        // This re-throws the error so the controller can catch it
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



