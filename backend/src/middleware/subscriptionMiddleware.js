
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Ensures the user has an active subscription
 * This middleware MUST run after requireAuth
 */

export const requireSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ msg: "Log in required" });

    const now = new Date().toISOString();
    let finalPlan = null;

    // 1. Try to fetch an active subscription
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .gt("expires_at", now)
      .maybeSingle();

    if (subError) {
      console.error("STEP 1 FAIL: Sub lookup error", subError);
    }

    // 2. If paid sub exists, get that plan
    if (sub?.plan_id) {
      const { data: paidPlan, error: paidPlanErr } = await supabase
        .from("plans")
        .select("*")
        .eq("id", sub.plan_id)
        .maybeSingle();
      
      if (paidPlan) finalPlan = paidPlan;
      if (paidPlanErr) console.error("STEP 2 FAIL: Paid plan fetch error", paidPlanErr);
    }

    // 3. ROLLBACK: Fetch Free plan if no paid plan found
    if (!finalPlan) {
      const { data: freePlan, error: freeError } = await supabase
        .from("plans")
        .select("*")
        .eq("name", "Free")
        .maybeSingle();

      if (freeError || !freePlan) {
          console.error("STEP 3 FAIL: Free plan lookup error", freeError);
          // HARDCODED FALLBACK: This prevents the "Subscription check failed" error 
          // even if the database fails to return the Free plan row.
          finalPlan = { name: "Free", chat_limit: 30, tts_limit: 30, stt_limit: 30, s2s_limit: 30 };
      } else {
          finalPlan = freePlan;
      }
    }

    req.subscription = { plan: finalPlan };
    next();
  } catch (err) {
    console.error("CRITICAL MIDDLEWARE ERROR:", err);
    res.status(500).json({ msg: "Subscription check failed", error: err.message });
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






