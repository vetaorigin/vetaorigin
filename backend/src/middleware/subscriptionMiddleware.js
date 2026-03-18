
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Ensures the user has an active subscription
 * This middleware MUST run after requireAuth
 */

export const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      logger.warn("Subscription check failed: No user found on request object");
      return res.status(401).json({ msg: "Unauthorized: Please log in first" });
    }

    const userId = req.user.id;
    const now = new Date().toISOString();

    logger.info(`Checking subscription for user: ${userId}`);

    // 1. Fetch the latest active paid subscription (NO JOIN to avoid PGRST201 error)
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, plan_id, status, expires_at") 
      .eq("user_id", userId)
      .gt("expires_at", now) 
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.error("Database error during sub check", { userId, error: subError });
      return res.status(500).json({ msg: "Subscription check failed" });
    }

    let finalSubscription = null;

    // 2. If a paid subscription exists, fetch its plan details separately
    if (subscription && subscription.plan_id) {
      const { data: planData } = await supabase
        .from("plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .single();
      
      if (planData) {
        finalSubscription = {
          ...subscription,
          plan: planData // Attach plan details (limits, etc.)
        };
      }
    }

    // 3. ROLLBACK LOGIC: If no paid sub found (or plan fetch failed), default to Free plan
    if (!finalSubscription) {
      logger.info(`No active paid sub for ${userId}. Rolling back to Free Tier.`);
      
      const { data: freePlan, error: freeError } = await supabase
        .from("plans")
        .select("*")
        .eq("name", "Free") // Ensure 'Free' is capitalized exactly like in your DB
        .single();

      if (freeError || !freePlan) {
        logger.error("Free plan missing in DB", { freeError });
        return res.status(500).json({ msg: "System Error: Free plan configuration missing." });
      }

      finalSubscription = {
        id: "free-tier",
        plan_id: freePlan.id,
        plan: freePlan,
        status: "active"
      };
    }

    // 4. Attach to request and proceed
    req.subscription = finalSubscription;
    logger.info(`Access granted via ${finalSubscription.plan.name} plan for user: ${userId}`);
    
    next();
  } catch (err) {
    logger.error("Subscription middleware critical error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};




// export const requireSubscription = async (req, res, next) => {
//   try {
//     if (!req.user || !req.user.id) {
//       logger.warn("Subscription check failed: No user found on request object");
//       return res.status(401).json({ msg: "Unauthorized: Please log in first" });
//     }

//     const userId = req.user.id;
//     const now = new Date().toISOString();

//     logger.info(`Checking subscription for user: ${userId}`);

//     // 1. Fetch the latest active paid subscription
//     const { data: subscription, error } = await supabase
//       .from("subscriptions")
//       .select("*, plans(*)") // Fetch plan details too
//       .eq("user_id", userId)
//       .gt("expires_at", now) 
//       .order("expires_at", { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     if (error) {
//       logger.error("Database error during subscription check", { userId, error });
//       return res.status(500).json({ msg: "Subscription check failed" });
//     }

//     // 2. ROLLBACK LOGIC: If no paid subscription is found, fetch the "Free" plan
//     if (!subscription) {
//       logger.info(`No active paid sub for ${userId}. Rolling back to Free Tier.`);
      
//       const { data: freePlan, error: freeError } = await supabase
//         .from("plans")
//         .select("*")
//         .eq("name", "Free")
//         .single();

//       if (freeError || !freePlan) {
//         return res.status(500).json({ msg: "Critical error: Free plan configuration missing in DB." });
//       }

//       // Attach a "mock" subscription object using the Free plan details
//       req.subscription = {
//         id: "free-tier",
//         plan_id: freePlan.id,
//         plan: freePlan, // Attach the plan limits (30 chats, etc.)
//         status: "active"
//       };
      
//       return next();
//     }

//     // 3. Success for Paid Subscribers
//     req.subscription = subscription;
//     logger.info(`Paid subscription verified for user: ${userId}`);
    
//     next();
//   } catch (err) {
//     logger.error("Subscription middleware critical error", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };






