import { supabaseAdmin as supabase } from "./supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * FETCH: Retrieves a user's subscription with plan details joined.
 * Used by controllers or internal middleware.
 */
export const getSubscriptionData = async (userId) => {
    const { data, error } = await supabase
        .from("subscriptions")
        .select(`
            id,
            plan_id,
            status,
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

    if (error) {
        logger.error("SUBSCRIPTION_FETCH_FAILED", { userId, error: error.message });
        throw new Error("Failed to retrieve subscription data");
    }
    
    return data;
};

/**
 * UPSERT: Used by Signups or Payment Webhooks.
 * Uses Admin client to ensure RLS bypass.
 */
export const upsertSubscription = async (userId, plan_id, durationDays = 30) => {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const { data, error } = await supabase
            .from("subscriptions")
            .upsert(
                { 
                    user_id: userId, 
                    plan_id: plan_id, 
                    expires_at: expiresAt.toISOString(),
                    status: 'active' 
                },
                { onConflict: "user_id" }
            )
            .select()
            .single();

        if (error) throw error;
        
        logger.info("SUBSCRIPTION_UPSERTED", { userId, plan_id });
        return data;
    } catch (err) {
        logger.error("SUBSCRIPTION_UPSERT_FAILED", { userId, error: err.message });
        throw err;
    }
};