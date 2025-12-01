// middleware/subscriptionMiddleware.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Ensures the user has an active subscription
 */
export const requireSubscription = async (req, res, next) => {
  try {
    // Make sure the user is logged in first
    if (!req.session || !req.session.userId) {
      logger.warn("Unauthorized access attempt: not logged in");
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const userId = req.session.userId;

    // Fetch active subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString()) // expires in future
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("Subscription check failed", { userId, error });
      return res.status(500).json({ msg: "Subscription check failed", error });
    }

    if (!subscription) {
      logger.warn("Unauthorized access attempt: no active subscription", { userId });
      return res.status(403).json({ msg: "No active subscription" });
    }

    // Attach subscription info for controllers (optional)
    req.subscription = subscription;

    next();
  } catch (err) {
    logger.error("Subscription middleware error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
