 // src/services/subscriptionService.js
import { supabase, supabaseAdmin } from "./supabaseClient.js"; 
import { initLogger } from "../utils/logger.js";
import { now } from "../utils/helper.js"; // Returns SECONDS
import { TIERS } from "../utils/tiers.js";  

const logger = initLogger();

// Time constants
const ONE_SECOND_MS = 1000;
const ONE_DAY_SECONDS = 86400; 
const DURATION_DAYS = 30; 

/* -------------------------------------------------------
    Fetch current subscription
-------------------------------------------------------- */
export const getSubscription = async (userId) => {
    try {
        // ✅ Use supabaseAdmin to ensure we can always read the sub status internally
        const { data, error } = await supabaseAdmin
            .from("subscriptions")
            .select("id, user_id, plan_id, expires_at, created_at") 
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
             logger.error("SUBSCRIPTION FETCH QUERY FAILED", error);
             throw error;
        }
        
        return data; 

    } catch (err) {
        logger.error("SUBSCRIPTION FETCH ERROR", err);
        return null; // Return null instead of throwing to prevent middleware crashes
    }
};

/* -------------------------------------------------------
    Check if subscription is active
-------------------------------------------------------- */
export const isActive = async (userId) => {
    try {
        const sub = await getSubscription(userId);
        
        if (!sub || !sub.expires_at) { 
            return false;
        }

        const expirationDate = new Date(sub.expires_at); 
        const currentDate = new Date(); 

        return expirationDate > currentDate;
    } catch (err) {
        logger.error("Error during isActive check", err);
        return false;
    }
};

/* -------------------------------------------------------
    Get plan limits
-------------------------------------------------------- */
export const getPlanLimits = async (userId) => {
    try {
        const sub = await getSubscription(userId);

        if (!sub || !sub.plan_id) return TIERS.free; 

        // plan_id is UUID → convert to plan name
        const { data: plan, error } = await supabaseAdmin
            .from("plans")
            .select("name")
            .eq("id", sub.plan_id)
            .maybeSingle();

        if (error || !plan) return TIERS.free;

        const planKey = plan.name.toLowerCase();
        return TIERS[planKey] || TIERS.free;

    } catch (err) {
        logger.error("getPlanLimits failed", err);
        return TIERS.free;
    }
};

/* -------------------------------------------------------
    UPSERT SUBSCRIPTION (The Payment Success Handler)
-------------------------------------------------------- */
export const upsertSubscription = async (userId, planId) => {
    try {
        logger.info("UPSERT SUBSCRIPTION START", { userId, planId });

        // Validate UUID
        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        if (!planId || !uuidRegex.test(planId)) {
            logger.error("Invalid planId → must be a valid UUID");
            return null;
        }

        // Calculate expiration (Now + 30 days)
        const expiresAtValue = new Date((now() + (DURATION_DAYS * ONE_DAY_SECONDS)) * ONE_SECOND_MS).toISOString();

        // -----------------------------------------
        // ✅ USE .upsert(): Cleaner and handles conflict automatically
        // -----------------------------------------
        const { data, error } = await supabaseAdmin
            .from("subscriptions")
            .upsert({
                user_id: userId,
                plan_id: planId,
                expires_at: expiresAtValue,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'user_id', // Ensures it updates if user already has a row
                ignoreDuplicates: false 
            })
            .select()
            .single();

        if (error) {
            logger.error("SUBSCRIPTION UPSERT FAILED", error);
            return null;
        }

        logger.info("SUBSCRIPTION UPSERT SUCCESSFUL", { userId, planId, expiresAt: expiresAtValue });
        return data;

    } catch (err) {
        logger.error("UPSERT SUBSCRIPTION CRITICAL ERROR", err);
        return null;
    }
};




// import { supabase } from "./supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// import { now } from "../utils/helper.js"; // ⬅️ This returns SECONDS
// // NOTE: Assuming TIERS is available. If you don't use it here, remove this line.
//  import { TIERS } from "../utils/tiers.js"; 

// const logger = initLogger();

// // Time constants in the units required by the calculation:
// const ONE_SECOND_MS = 1000;
// const ONE_DAY_SECONDS = 86400; // 60 * 60 * 24 seconds (Used with now())
// const DURATION_DAYS = 30; // Standard duration for new subscriptions

// /* -------------------------------------------------------
//     Fetch current subscription
// -------------------------------------------------------- */
// export const getSubscription = async (userId) => {
//     try {
//         const { data, error } = await supabase
//             .from("subscriptions")
//             // Selecting columns as they are stored (TIMESTAMPTZ, UUID, etc.)
//             .select("id, user_id, plan_id, expires_at, created_at") 
//             .eq("user_id", userId)
//             .maybeSingle();

//         if (error) {
//              logger.error("SUBSCRIPTION FETCH QUERY FAILED", error);
//              throw error;
//         }
        
//         return data; 

//     } catch (err) {
//         logger.error("SUBSCRIPTION FETCH ERROR (Catch Block)", err);
//         throw err;
//     }
// };

// /* -------------------------------------------------------
//     Check if subscription is active (Uses Date Strings)
// -------------------------------------------------------- */
// export const isActive = async (userId) => {
//     const sub = await getSubscription(userId);
    
//     // Check for null or if expires_at is missing/null
//     if (!sub || !sub.expires_at) { 
//         logger.warn("Subscription or valid expires_at missing/null", { userId: userId });
//         return false;
//     }

//     try {
//         // We use the robust Date comparison to avoid any ambiguity
//         const expirationDate = new Date(sub.expires_at); 
//         const currentDate = new Date(); 

//         const isSubscriptionActive = expirationDate > currentDate;

//         if (!isSubscriptionActive) {
//              logger.info("Subscription is expired", { userId: userId, expiresAt: sub.expires_at });
//         }
        
//         return isSubscriptionActive;

//     } catch (err) {
//         logger.error("Error during isActive date comparison", err);
//         return false;
//     }
// };

// /* -------------------------------------------------------
//     Get plan limits (Requires TIERS object to be available)
// -------------------------------------------------------- */
// export const getPlanLimits = async (userId) => {
//     try {
//         const sub = await getSubscription(userId);

//         // NOTE: Replace TIERS.free with actual fallback if TIERS object isn't defined here
//         if (!sub || !sub.plan_id) return TIERS.free; 

//         // plan_id is UUID → convert to plan name
//         const { data: plan, error } = await supabase
//             .from("plans")
//             .select("name")
//             .eq("id", sub.plan_id)
//             .maybeSingle();

//         if (error || !plan) return TIERS.free;

//         const planKey = plan.name.toLowerCase();

//         return TIERS[planKey] || TIERS.free;

//     } catch (err) {
//         logger.error("getPlanLimits failed", err);
//         return TIERS.free;
//     }
// };

// /* -------------------------------------------------------
//     UPSERT SUBSCRIPTION (Inserts TIMESTAMPTZ String)
// -------------------------------------------------------- */
// export const upsertSubscription = async (userId, planId) => {
//     try {
//         logger.info("UPSERT SUBSCRIPTION", { userId, planId });

//         if (!planId) {
//             logger.error("INVALID PLAN_ID");
//             return null;
//         }

//         const uuidRegex = /^[0-9a-fA-F-]{36}$/;
//         if (!uuidRegex.test(planId)) {
//             logger.error("Invalid planId → must be UUID");
//             return null;
//         }

//         // 🛑 CRITICAL FIX: Calculation performed in SECONDS, then converted to MILLISECONDS for Date object
        
//         // 1. Get current time in SECONDS
//         const currentTimeSeconds = now(); 
        
//         // 2. Calculate duration in SECONDS and add to current time
//         const durationSeconds = DURATION_DAYS * ONE_DAY_SECONDS;
//         const futureSeconds = currentTimeSeconds + durationSeconds;
        
//         // 3. Convert the final epoch time from SECONDS to MILLISECONDS for the Date constructor
//         const futureMs = futureSeconds * ONE_SECOND_MS;

//         // 4. Create the ISO string for the TIMESTAMPTZ column
//         const expiresAtValue = new Date(futureMs).toISOString(); 

//         // -----------------------------------------
//         // 1. Check if subscription already exists 
//         // -----------------------------------------
//         const { data: existing, error: fetchErr } = await supabase
//             .from("subscriptions")
//             .select("id")
//             .eq("user_id", userId)
//             .maybeSingle();

//         if (fetchErr) {
//             logger.error("SUBSCRIPTION FETCH FAILED", fetchErr);
//             return null;
//         }

//         // -----------------------------------------
//         // 2. UPDATE existing subscription
//         // -----------------------------------------
//         if (existing) {
//             const { data, error } = await supabase
//                 .from("subscriptions")
//                 .update({
//                     plan_id: planId,
//                     expires_at: expiresAtValue, // ⬅️ Sending TIMESTAMPTZ string
//                 })
//                 .eq("user_id", userId)
//                 .select()
//                 .maybeSingle();

//             if (error) {
//                 logger.error("SUBSCRIPTION UPDATE FAILED", error);
//                 return null;
//             }

//             logger.info("SUBSCRIPTION UPDATED", { userId, planId });
//             return data;
//         }

//         // -----------------------------------------
//         // 3. INSERT new subscription
//         // -----------------------------------------
//         const { data, error } = await supabase
//             .from("subscriptions")
//             .insert([
//                 {
//                     user_id: userId,
//                     plan_id: planId,
//                     expires_at: expiresAtValue, // ⬅️ Sending TIMESTAMPTZ string
//                     created_at: new Date().toISOString()
//                 }
//             ])
//             .select()
//             .maybeSingle();

//         if (error) {
//             logger.error("SUBSCRIPTION INSERT FAILED", error);
//             return null;
//         }

//         logger.info("SUBSCRIPTION CREATED", { userId, planId });
//         return data;

//     } catch (err) {
//         logger.error("UPSERT SUB CRASHED", err);
//         return null;
//     }
// };

