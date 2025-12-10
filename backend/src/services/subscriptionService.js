// src/services/subscriptionService.js

import { supabase } from "./supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { now } from "../utils/helper.js"; // ⬅️ NEW: Import now() for consistent time calculation
// NOTE: You may also need to import TIERS if not globally available:
 import { TIERS } from "../utils/tiers.js"; 


const logger = initLogger();

/* -------------------------------------------------------
    Fetch current subscription
-------------------------------------------------------- */
export const getSubscription = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("subscriptions")
            // ⚠️ Changed to select specific columns for robustness instead of '*'
            .select("id, user_id, plan_id, expires_at, status") 
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        return data;

    } catch (err) {
        logger.error("SUBSCRIPTION FETCH ERROR", err);
        throw err;
    }
};

/* -------------------------------------------------------
    Check if subscription is active
-------------------------------------------------------- */
export const isActive = async (userId) => {
    const sub = await getSubscription(userId);
    if (!sub || !sub.expires_at) return false;
    return new Date(sub.expires_at) > new Date();
};

/* -------------------------------------------------------
    Get plan limits 
-------------------------------------------------------- */
export const getPlanLimits = async (userId) => {
    try {
        const sub = await getSubscription(userId);

        // This assumes TIERS is globally available or imported
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

/* -------------------------------------------------------
    UPSERT SUBSCRIPTION (no duplicate forever)
-------------------------------------------------------- */
// One day in milliseconds: 1000 * 60 * 60 * 24
const ONE_DAY_MS = 86400000;
const DURATION_DAYS = 30;

export const upsertSubscription = async (userId, planId) => {
    try {
        logger.info("UPSERT SUBSCRIPTION", { userId, planId });

        if (!planId) {
            logger.error("INVALID PLAN_ID");
            return null;
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F-]{36}$/;
        if (!uuidRegex.test(planId)) {
            logger.error("Invalid planId → must be UUID");
            return null;
        }

        // 🚨 FIX: Calculate expiration date based on consistent time and ensure ISO format
        // expiresAt is a timestamp (milliseconds since epoch)
        const expiresAtTimestamp = now() + (DURATION_DAYS * ONE_DAY_MS);
        const expiresAtISO = new Date(expiresAtTimestamp).toISOString(); 

        // -----------------------------------------
        // 1. Check if subscription already exists (using minimal select)
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
                    expires_at: expiresAtISO, // ⬅️ Using the guaranteed ISO string
                    updated_at: new Date().toISOString()
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
                    expires_at: expiresAtISO, // ⬅️ Using the guaranteed ISO string
                    status: "active",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
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
