// Import supabaseAdmin
import { supabase, supabaseAdmin } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: "Unauthorized: Please log in first" });
    }

    const userId = req.user.id;
    const now = new Date().toISOString();

    // ✅ FIX: Use supabaseAdmin to bypass RLS
    // Without this, RLS hides the subscription from your backend
    const { data: subscription, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", now) 
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("Database error during subscription check", { userId, error });
      return res.status(500).json({ msg: "Subscription check failed" });
    }

    if (!subscription) {
      // Log the specific ID so you can check it in the Supabase Dashboard
      logger.warn(`Access denied: No subscription for ID ${userId}`);
      return res.status(403).json({ 
        msg: "No active subscription found.",
        userId: userId // Useful for debugging
      });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    logger.error("Subscription middleware critical error", err);
    res.status(500).json({ msg: "Server error" });
  }
};


// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// /**
//  * Ensures the user has an active subscription
//  * This middleware MUST run after requireAuth
//  */
// export const requireSubscription = async (req, res, next) => {
//   try {
//     // 1. Check if req.user exists (set by your requireAuth middleware)
//     if (!req.user || !req.user.id) {
//       logger.warn("Subscription check failed: No user found on request object");
//       return res.status(401).json({ msg: "Unauthorized: Please log in first" });
//     }

//     const userId = req.user.id;
//     const now = new Date().toISOString();

//     logger.info(`Checking subscription for user: ${userId}`);

//     // 2. Fetch the latest active subscription from Supabase
//     const { data: subscription, error } = await supabase
//       .from("subscriptions")
//       .select("*")
//       .eq("user_id", userId)
//       .gt("expires_at", now) // Must expire in the future
//       .order("expires_at", { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     // 3. Handle Database Errors
//     if (error) {
//       logger.error("Database error during subscription check", { userId, error });
//       return res.status(500).json({ 
//         msg: "Subscription check failed", 
//         error: error.message 
//       });
//     }

//     // 4. Handle Missing/Expired Subscription
//     if (!subscription) {
//       logger.warn("Access denied: No active subscription found", { userId });
//       return res.status(403).json({ 
//         msg: "No active subscription. Please upgrade your plan to continue." 
//       });
//     }

//     // 5. Success! Attach subscription info and move to the next step
//     req.subscription = subscription;
//     logger.info(`Subscription verified for user: ${userId}`);
    
//     next();
//   } catch (err) {
//     logger.error("Subscription middleware critical error", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };
