// Import both clients from your service file
import { supabase, supabaseAdmin } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * GET SUBSCRIPTION: Fetches the current user's plan and remaining time
 */
export const getSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized: No user ID found" });
    }

    // Use supabaseAdmin here to ensure the backend can always retrieve the user's plan 
    // even if the RLS policy for the 'plans' join is strict.
    const { data, error } = await supabaseAdmin
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
      logger.error("SUBSCRIPTION FETCH ERROR:", error);
      return res.status(500).json({ msg: "Failed to load subscription data" });
    }

    if (!data) {
      return res.status(404).json({ msg: "No active subscription found for this user" });
    }

    res.json({ 
      success: true,
      subscription: data 
    });

  } catch (err) {
    logger.error("GET SUB ERROR:", err);
    res.status(500).json({ msg: "Server error retrieving subscription" });
  }
};

/**
 * UPSERT SUBSCRIPTION: Called during Signup or after successful payment
 * ✅ FIX: Now uses supabaseAdmin to bypass RLS during signup/webhooks
 */
export const upsertSubscription = async (userId, plan_id, durationDays = 30) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Using Admin client is CRITICAL here because this function is often 
    // called by other services (like auth or payment webhooks) where 
    // a standard user session might not be present.
    const { data, error } = await supabaseAdmin
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
    
    logger.info("Subscription record UPSERTED via Admin", { userId, plan_id });
    return data;
  } catch (err) {
    logger.error("Upsert subscription failed", err);
    throw err;
  }
};




// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// // TIERS import removed as we now use the 'plans' table limits

// const logger = initLogger();

// /**
//  * GET SUBSCRIPTION: Fetches the current user's plan and remaining time
//  */
// export const getSubscription = async (req, res) => {
//   try {
//     // ✅ CHANGE: Use JWT userId from middleware
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({ msg: "Unauthorized: No user ID found" });
//     }

//     // ✅ CHANGE: Use !fk_plan to avoid the "more than one relationship" error
//     const { data, error } = await supabase
//       .from("subscriptions")
//       .select(`
//         id,
//         plan_id,
//         status,
//         expires_at,
//         plans!fk_plan (
//             name,
//             chat_limit,
//             tts_limit,
//             stt_limit,
//             s2s_limit
//         )
//       `)
//       .eq("user_id", userId)
//       .maybeSingle();

//     if (error) {
//       logger.error("SUBSCRIPTION FETCH ERROR:", error);
//       return res.status(500).json({ msg: "Failed to load subscription data" });
//     }

//     if (!data) {
//       return res.status(404).json({ msg: "No active subscription found for this user" });
//     }

//     // Return the combined data to the Flutter app
//     res.json({ 
//       success: true,
//       subscription: data 
//     });

//   } catch (err) {
//     logger.error("GET SUB ERROR:", err);
//     res.status(500).json({ msg: "Server error retrieving subscription" });
//   }
// };

// /**
//  * UPSERT SUBSCRIPTION: Called during Signup or after successful payment
//  */
// export const upsertSubscription = async (userId, plan_id, durationDays = 30) => {
//   try {
//     // Calculate expiration date
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + durationDays);

//     const { data, error } = await supabase
//       .from("subscriptions")
//       .upsert(
//         { 
//           user_id: userId, 
//           plan_id: plan_id, 
//           expires_at: expiresAt.toISOString(),
//           status: 'active' 
//         },
//         { onConflict: "user_id" }
//       )
//       .select()
//       .single();

//     if (error) throw error;
    
//     logger.info("Subscription record UPSERTED", { userId, plan_id });
//     return data;
//   } catch (err) {
//     logger.error("Upsert subscription failed", err);
//     throw err;
//   }
// };
