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

// -----------------------------------------------------------
// CHECK USAGE: Uses RPC to get rolling 24-hour count
// -----------------------------------------------------------
export async function checkUsage(userId, mode) {
    try {
        logger.debug("Checking usage...", { userId, mode });

        // 1. Validate mode
        if (!VALID_MODES.includes(mode)) {
            logger.warn("Invalid mode passed to checkUsage", { mode });
            throw new Error("Invalid mode");
        }

        // 2. Fetch subscription
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

        // 4. Get the limit (using default for now, can be updated later)
        const limit = FREE_LIMITS[mode];

        // 5. Fetch current usage (ROLLING 24-HOUR COUNT via RPC)
        // This RPC calls the PostgreSQL function that filters records from the last 24 hours.
        const { data: usageData, error: usageError } = await supabase.rpc("get_daily_usage", {
            userid: userId,
            mode_name: mode,
        }).single(); // Use .single() as the RPC returns one row { daily_count: N }

        if (usageError) {
            logger.error("RPC get_daily_usage error", usageError);
            throw new Error("Unable to fetch usage count");
        }

        // The RPC returns a single object like { daily_count: 5 }
        const used = usageData?.daily_count ?? 0;
        const nextUsage = used + ONE_REQUEST;

        // 6. Limit check
        if (nextUsage > limit) {
            logger.warn("User exceeded daily plan limit", {
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

// -----------------------------------------------------------
// ADD USAGE: Inserts a single usage event (log)
// -----------------------------------------------------------
export async function addUsage(userId, mode) {
    try {
        logger.debug("Recording usage event...", { userId, mode });

        if (!VALID_MODES.includes(mode)) {
            throw new Error("Invalid mode");
        }

        // 🚨 CRITICAL CHANGE: We INSERT a new record instead of calling an RPC to increment a counter.
        // The `created_at` column (set by the DB) handles the timestamp.
        const { error } = await supabase
            .from("usage")
            .insert([
                { 
                    user_id: userId, 
                    type: mode, 
                    units: ONE_REQUEST // Assuming you added a 'units' column (INT) to the usage table
                } 
            ]);

        if (error) {
            logger.error("Usage insertion error", error);
            throw new Error("Failed to record usage event");
        }

        logger.info("Usage event recorded", { userId, mode });
    } catch (err) {
        logger.error("addUsage error", err);
        throw err;
    }
}

export default checkUsage;




