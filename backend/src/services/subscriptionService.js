// src/services/subscriptionService.js

import { supabase } from "./supabaseClient.js";
import { initLogger } from "../utils/logger.js";
// NOTE: Assuming now() returns Date.now() (epoch milliseconds)
import { now } from "../utils/helper.js"; 
// NOTE: Ensure TIERS is available, either imported or defined globally
 import { TIERS } from "../utils/tiers.js"; 

const logger = initLogger();

// One day in milliseconds: 1000 * 60 * 60 * 24
const ONE_DAY_MS = 86400000;
const DURATION_DAYS = 30; // Standard duration for new subscriptions

/* -------------------------------------------------------
    Fetch current subscription
-------------------------------------------------------- */
export const getSubscription = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("subscriptions")
            // Selecting columns as they are stored (TIMESTAMPTZ, UUID, etc.)
            .select("id, user_id, plan_id, expires_at, created_at") 
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
             logger.error("SUBSCRIPTION FETCH QUERY FAILED", error);
             throw error;
        }
        
        return data; 

    } catch (err) {
        logger.error("SUBSCRIPTION FETCH ERROR (Catch Block)", err);
        throw err;
    }
};

---

/* -------------------------------------------------------
    Check if subscription is active (Uses Date Strings)
-------------------------------------------------------- */
export const isActive = async (userId) => {
    const sub = await getSubscription(userId);
    
    // Check for null or if expires_at is missing/null
    if (!sub || !sub.expires_at) { 
        logger.warn("Subscription or valid expires_at missing/null", { userId: userId });
        return false;
    }

    try {
        // expires_at is now a TIMESTAMPTZ string (e.g., "2025-12-10T...")
        const expirationTime = Date.parse(sub.expires_at); 
        const currentTime = now(); // Consistent current time in milliseconds

        // Perform numerical comparison after parsing the string to epoch milliseconds
        const isSubscriptionActive = expirationTime > currentTime;

        if (!isSubscriptionActive) {
             logger.info("Subscription is expired", { userId: userId, expiresAt: sub.expires_at });
        }
        
        return isSubscriptionActive;

    } catch (err) {
        logger.error("Error during isActive date comparison", err);
        return false;
    }
};

---

/* -------------------------------------------------------
    Get plan limits 
    (Requires TIERS object to be available)
-------------------------------------------------------- */
export const getPlanLimits = async (userId) => {
    try {
        const sub = await getSubscription(userId);

        if (!sub || !sub.plan_id) return TIERS.free; 

        // plan_id is UUID → convert to plan name
        const { data: plan, error } = await supabase
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

---

/* -------------------------------------------------------
    UPSERT SUBSCRIPTION (Final: Inserts TIMESTAMPTZ String)
-------------------------------------------------------- */
export const upsertSubscription = async (userId, planId) => {
    try {
        logger.info("UPSERT SUBSCRIPTION", { userId, planId });

        if (!planId) {
            logger.error("INVALID PLAN_ID");
            return null;
        }

        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        if (!uuidRegex.test(planId)) {
            logger.error("Invalid planId → must be UUID");
            return null;
        }

        // 🛑 CRITICAL FIX: Calculate future date in milliseconds, then convert to ISO string 
        // for the TIMESTAMPTZ column.
        const futureMs = now() + (DURATION_DAYS * ONE_DAY_MS);
        const expiresAtValue = new Date(futureMs).toISOString(); // ⬅️ Send ISO 8601 string

        // -----------------------------------------
        // 1. Check if subscription already exists 
        // -----------------------------------------
        const { data: existing, error: fetchErr } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchErr) {
            logger.error("SUBSCRIPTION FETCH FAILED", fetchErr);
            return null;
        }

        // -----------------------------------------
        // 2. UPDATE existing subscription
        // -----------------------------------------
        if (existing) {
            const { data, error } = await supabase
                .from("subscriptions")
                .update({
                    plan_id: planId,
                    expires_at: expiresAtValue, // ⬅️ Sending TIMESTAMPTZ string
                })
                .eq("user_id", userId)
                .select()
                .maybeSingle();

            if (error) {
                logger.error("SUBSCRIPTION UPDATE FAILED", error);
                return null;
            }

            logger.info("SUBSCRIPTION UPDATED", { userId, planId });
            return data;
        }

        // -----------------------------------------
        // 3. INSERT new subscription
        // -----------------------------------------
        const { data, error } = await supabase
            .from("subscriptions")
            .insert([
                {
                    user_id: userId,
                    plan_id: planId,
                    expires_at: expiresAtValue, // ⬅️ Sending TIMESTAMPTZ string
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .maybeSingle();

        if (error) {
            logger.error("SUBSCRIPTION INSERT FAILED", error);
            return null;
        }

        logger.info("SUBSCRIPTION CREATED", { userId, planId });
        return data;

    } catch (err) {
        logger.error("UPSERT SUB CRASHED", err);
        return null;
    }
};
