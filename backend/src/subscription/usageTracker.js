import { supabase, supabaseAdmin } from "../services/supabaseClient.js"; // Added Admin
import { initLogger } from "../utils/logger.js";

const logger = initLogger();
const VALID_TYPES = ["chat", "tts", "stt", "s2s"];

/** 
 * Fetch usage for a specific type
 */
export const getUsage = async (userId, type) => {
  try {
    if (!VALID_TYPES.includes(type)) throw new Error(`Invalid usage type: ${type}`);

    // ✅ Using Admin ensures we can always read usage
    const { data, error } = await supabaseAdmin
      .from("usage")
      .select("used") // Based on your previous message, your column is named 'used'
      .eq("user_id", userId)
      .eq("type", type) // Since your table uses a 'type' column
      .maybeSingle();

    if (error) throw error;
    return data ? data.used : 0;
  } catch (err) {
    logger.error("getUsage failed", err);
    throw err;
  }
};

/**
 * Increment usage count
 */

export const addUsage = async (userId, type, amount = 1) => {
  try {
    if (!VALID_TYPES.includes(type)) throw new Error(`Invalid usage type: ${type}`);

    // 1. Get the current record to check the date
    const { data: currentRecord } = await supabaseAdmin
      .from("usage")
      .select("used, updated_at")
      .eq("user_id", userId)
      .eq("type", type)
      .maybeSingle();

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    let newUsed = amount;

    if (currentRecord && currentRecord.updated_at) {
      const lastUpdateDate = new Date(currentRecord.updated_at).toISOString().split('T')[0];

      if (lastUpdateDate === today) {
        // Same day: Increment existing usage
        newUsed = (currentRecord.used || 0) + amount;
      } else {
        // New day: Reset usage to 1 (or amount)
        logger.info(`New day detected for ${userId}. Resetting ${type} usage.`);
        newUsed = amount;
      }
    }

    // 2. Perform the upsert
    const { data, error } = await supabaseAdmin
      .from("usage")
      .upsert(
        { 
            user_id: userId, 
            type: type, 
            used: newUsed,
            updated_at: now
        },
        { onConflict: "user_id,type" } 
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    logger.info("Daily usage updated", { userId, type, used: newUsed });
    return data;
  } catch (err) {
    logger.error("addUsage failed", err);
    throw err;
  }
};



// export const addUsage = async (userId, type, amount = 1) => {
//   try {
//     if (!VALID_TYPES.includes(type)) throw new Error(`Invalid usage type: ${type}`);

//     const current = await getUsage(userId, type);
//     const newUsed = current + amount;

//     // ✅ Using Admin ensures the write is NEVER blocked by RLS
//     const { data, error } = await supabaseAdmin
//       .from("usage")
//       .upsert(
//         { 
//             user_id: userId, 
//             type: type, 
//             used: newUsed,
//             updated_at: new Date() 
//         },
//         { onConflict: "user_id,type" } // Matches your composite unique constraint
//       )
//       .select()
//       .maybeSingle();

//     if (error) throw error;

//     logger.info("Usage updated", { userId, type, used: newUsed });
//     return data;
//   } catch (err) {
//     logger.error("addUsage failed", err);
//     throw err;
//   }
// };

