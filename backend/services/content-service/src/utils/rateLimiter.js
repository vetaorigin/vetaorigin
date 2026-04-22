import { initLogger } from "./logger.js";
import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

const logger = initLogger();

export async function checkUsage(userId, mode) {
    try {
        const now = new Date();
        
        // 1. Fetch Subscription + Plan in ONE query (JOIN)
        const { data: sub, error: subError } = await supabase
            .from("subscriptions")
            .select(`
                plan_id, 
                expires_at,
                plans (id, name, chat_limit, tts_limit, stt_limit, s2s_limit)
            `)
            .eq("user_id", userId)
            .gt("expires_at", now.toISOString())
            .maybeSingle();

        if (subError) throw subError;

        // 2. Determine Plan
        let plan = sub?.plans;

        // Fallback to Free if no active subscription
        if (!plan) {
            const { data: freePlan } = await supabase
                .from("plans")
                .select("*")
                .eq("name", "Free")
                .single();
            plan = freePlan || { name: 'Free', chat_limit: 30, tts_limit: 30, stt_limit: 30, s2s_limit: 30 };
        }

        const limit = plan[`${mode}_limit`] || 30;

        // 3. Get Usage
        const { data: usageData } = await supabase
            .from("usage")
            .select("used, updated_at")
            .eq("user_id", userId)
            .eq("type", mode)
            .maybeSingle();

        const today = now.toISOString().split('T')[0];
        const lastUpdate = usageData?.updated_at ? new Date(usageData.updated_at).toISOString().split('T')[0] : null;
        
        const currentUsed = (lastUpdate === today) ? (usageData.used || 0) : 0;

        if ((currentUsed + 1) > limit) {
            throw new Error(`Daily ${mode} limit reached (${limit}) for your ${plan.name} plan.`);
        }

        return true;
    } catch (err) {
        logger.error("checkUsage Failure", { userId, mode, error: err.message });
        throw err;
    }
}

export async function addUsage(userId, mode) {
    try {
        const { data: usageData } = await supabase
            .from("usage")
            .select("used, updated_at")
            .eq("user_id", userId)
            .eq("type", mode)
            .maybeSingle();

        const today = new Date().toISOString().split('T')[0];
        const lastUpdate = usageData?.updated_at ? new Date(usageData.updated_at).toISOString().split('T')[0] : null;
        
        const newUsed = (lastUpdate === today) ? (usageData.used + 1) : 1;

        const { error } = await supabase
            .from('usage')
            .upsert({ 
                user_id: userId, 
                type: mode, 
                used: newUsed, 
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,type' });
        
        if (error) throw error;
        logger.info(`Usage recorded: ${userId} [${mode}] -> Total: ${newUsed}`);
    } catch (err) {
        logger.error("addUsage critical error", { userId, mode, error: err.message });
    }
}