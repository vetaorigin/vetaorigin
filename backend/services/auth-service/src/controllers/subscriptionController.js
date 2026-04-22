import { getSubscriptionData, upsertSubscription } from "../services/subscriptionService.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const getSubscription = async (req, res) => {
    try {
        const data = await getSubscriptionData(req.user.id);
        if (!data) return res.status(404).json({ msg: "No subscription found" });
        res.json({ success: true, subscription: data });
    } catch (err) {
        res.status(500).json({ msg: "Failed to load subscription" });
    }
};

/**
 * Internal route handler for payment webhooks
 */
export const updateSubscriptionStatus = async (req, res) => {
    try {
        const { userId, planId, durationDays } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({ msg: "Missing userId or planId" });
        }

        const data = await upsertSubscription(userId, planId, durationDays);
        res.json({ success: true, data });
    } catch (err) {
        logger.error("INTERNAL_SUB_UPDATE_FAILED", { error: err.message });
        res.status(500).json({ msg: "Internal update failed" });
    }
};