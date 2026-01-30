import crypto from "crypto"; // ✅ Added for Webhook verification
import { initializeTransaction, verifyTransaction } from "../services/paystackService.js";
import { upsertSubscription } from "../services/subscriptionService.js";
import { supabase, supabaseAdmin } from "../services/supabaseClient.js"; // ✅ Added supabaseAdmin
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

const getPlanUuidByName = async (planName) => {
    if (!planName) return null;
    try {
        const { data, error } = await supabaseAdmin // ✅ Use Admin to ensure plan lookup works
            .from("plans")
            .select("id")
            .eq("name", planName)
            .maybeSingle();

        if (error || !data) {
            logger.warn(`Could not find UUID for plan name: ${planName}`, error);
            return null;
        }
        return data.id;
    } catch (err) {
        logger.error("Error fetching plan UUID by name", err);
        return null;
    }
}

// ==============================================================
// INIT PAYMENT
// ==============================================================
export const initPayment = async (req, res) => {
    try {
        const userId = req.user?.id; 
        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        const planName = req.body.plan_id || req.body.planId;
        const rawAmount = req.body.amount || req.body.price;

        if (!planName || !rawAmount) {
            return res.status(400).json({ msg: "plan_id (name) & amount required" });
        }

        const amount = Number(rawAmount) * 100;

        const { data: user, error: userErr } = await supabaseAdmin // ✅ Use Admin
            .from("users")
            .select("email")
            .eq("id", userId)
            .maybeSingle();

        if (userErr || !user) {
            logger.error("User fetch failed", { error: userErr });
            return res.status(500).json({ msg: "User not found" });
        }

        const metadata = {
            plan_name: planName,
            user_id: userId
        };

        const init = await initializeTransaction({
            amount,
            email: user.email,
            metadata
        });

        logger.info("Payment initialized successfully", { planName, userId });
        return res.json(init);

    } catch (err) {
        logger.error("initPayment error", { error: err.stack || err });
        return res.status(500).json({ msg: "Payment init failed", error: err.message });
    }
};

// ======================================================================
// VERIFY PAYMENT (Client-side Redirect)
// ======================================================================
export const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;
        if (!reference) return res.status(400).json({ msg: "reference required" });

        const verify = await verifyTransaction(reference);
        const payData = verify?.data;

        if (!payData) {
            logger.error("Empty Paystack verify response", verify);
            return res.status(400).json({ msg: "Invalid Paystack response" });
        }

        const metadata = payData?.metadata || {};
        const planName = (metadata.plan_name || metadata.planname)?.trim();
        const userId = (metadata.user_id || metadata.userid)?.trim();

        if (payData.status === "success" && userId && planName) {
            const finalPlanId = await getPlanUuidByName(planName);
            if (finalPlanId) {
                await upsertSubscription(userId, finalPlanId);
            }

            // Record the payment
            await supabaseAdmin.from("payments").insert([{
                reference: payData.reference,
                user_id: userId,
                plan_id: finalPlanId, 
                amount: payData.amount / 100,
                currency: payData.currency,
                status: payData.status,
                raw: payData
            }]);

            return res.json({ ok: true, data: payData });
        }

        return res.status(400).json({ msg: "Payment failed", data: payData });

    } catch (err) {
        logger.error("verifyPayment error", err);
        return res.status(500).json({ msg: "Payment verify failed" });
    }
};

// ======================================================================
// ✅ NEW: HANDLE PAYSTACK WEBHOOK (Server-to-Server)
// ======================================================================
export const handlePaystackWebhook = async (req, res) => {
    try {
        // 1. Validate signature to ensure request is actually from Paystack
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret)
                           .update(JSON.stringify(req.body))
                           .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            logger.warn("Invalid Webhook Signature detected");
            return res.status(401).send('Unauthorized');
        }

        const event = req.body;

        // 2. Process success event
        if (event.event === 'charge.success') {
            const payData = event.data;
            const metadata = payData.metadata || {};
            const userId = metadata.user_id || metadata.userid;
            const planName = metadata.plan_name || metadata.planname;

            logger.info("Webhook: Processing charge.success", { userId, planName });

            if (userId && planName) {
                const finalPlanId = await getPlanUuidByName(planName);
                if (finalPlanId) {
                    await upsertSubscription(userId, finalPlanId);
                    logger.info("Webhook: Subscription updated");
                }
            }
        }

        // 3. Always respond with 200 to acknowledge receipt
        return res.status(200).send('Event Received');

    } catch (err) {
        logger.error("Webhook Handler Error", err);
        return res.status(500).send('Internal Error');
    }
};;




// // src/controllers/paymentController.js
// import { initializeTransaction, verifyTransaction } from "../services/paystackService.js";
// import { upsertSubscription } from "../services/subscriptionService.js";
// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// // ==============================================================
// // HELPER: Fetch Plan UUID by Plan Name (e.g., "enterprise" -> UUID)
// // ==============================================================
// const getPlanUuidByName = async (planName) => {
//     if (!planName) return null;
//     try {
//         const { data, error } = await supabase
//             .from("plans")
//             .select("id")
//             .eq("name", planName)
//             .maybeSingle();

//         if (error || !data) {
//             logger.warn(`Could not find UUID for plan name: ${planName}`, error);
//             return null;
//         }
//         return data.id;
//     } catch (err) {
//         logger.error("Error fetching plan UUID by name", err);
//         return null;
//     }
// }


// // ==============================================================
// // INIT PAYMENT
// // ==============================================================
// export const initPayment = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         // NOTE: planId here should be the PLAN NAME (e.g., "enterprise")
//         const planName = req.body.plan_id || req.body.planId;
//         const rawAmount = req.body.amount || req.body.price;

//         if (!planName || !rawAmount) {
//             return res.status(400).json({ msg: "plan_id (name) & amount required" });
//         }

//         // Convert NGN to kobo
//         const amount = Number(rawAmount) * 100;

//         // Fetch user email
//         const { data: user, error: userErr } = await supabase
//             .from("users")
//             .select("email")
//             .eq("id", userId)
//             .maybeSingle();

//         if (userErr || !user) {
//             logger.error("User fetch failed", { error: userErr });
//             return res.status(500).json({ msg: "User not found" });
//         }

//         // Correct metadata format for Paystack
//         const metadata = {
//             // Pass the NAME, as the UUID is not known or needed yet
//             planName,     
//             userId        // UUID
//         };

//         logger.info("Sending metadata to Paystack", metadata);

//         const init = await initializeTransaction({
//             amount,
//             email: user.email,
//             metadata
//         });

//         logger.info("Payment initialized successfully", { planName, userId });

//         return res.json(init);

//     } catch (err) {
//         logger.error("initPayment error", { error: err.stack || err });
//         return res.status(500).json({ msg: "Payment init failed", error: err.message });
//     }
// };


// // ======================================================================
// // VERIFY PAYMENT — User returns from Paystack payment page
// // ======================================================================
// export const verifyPayment = async (req, res) => {
//     try {
//         const { reference } = req.query;
//         if (!reference) return res.status(400).json({ msg: "reference required" });

//         const verify = await verifyTransaction(reference);
//         const payData = verify?.data;

//         if (!payData) {
//             logger.error("Empty Paystack verify response", verify);
//             return res.status(400).json({ msg: "Invalid Paystack response" });
//         }

//         // Metadata returned by Paystack (keys are lowercase: planname, userid)
//         const metadata = payData?.metadata || {};
//         const planName = metadata.planname ? String(metadata.planname).trim() : null; // Retrieve the name (e.g., "enterprise")
//         const userId = metadata.userid ? String(metadata.userid).trim() : null;

//         logger.info("Verify Payment Metadata:", { planName, userId });
        
//         // This is the variable that must hold the UUID for the database
//         let finalPlanId = null; 

//         if (payData.status === "success" && userId && planName) {
            
//             // 🚨 FIX STEP 1: Get the correct UUID from the database
//             finalPlanId = await getPlanUuidByName(planName);

//             if (!finalPlanId) {
//                  logger.error(`Could not find UUID for plan: ${planName}. Subscription update skipped.`);
//             }

//             // Update subscription
//             if (userId && finalPlanId) {
//                 try {
//                     // 🚨 FIX STEP 2: Use the valid UUID for the database update
//                     await upsertSubscription(userId, finalPlanId); 
//                     logger.info("Subscription updated successfully", { userId, finalPlanId });
//                 } catch (subErr) {
//                     logger.error("Subscription update failed", subErr);
//                 }
//             } else {
//                 logger.error("Missing critical data for update", { userId, finalPlanId });
//             }

//             // Store payment
//             const insertRes = await supabase.from("payments").insert([
//                 {
//                     reference: payData.reference,
//                     user_id: userId || null,
//                     // Store the UUID in the payments table
//                     plan_id: finalPlanId || null, 
//                     amount: payData.amount / 100,
//                     currency: payData.currency,
//                     status: payData.status,
//                     raw: payData
//                 }
//             ]);

//             if (insertRes.error) {
//                 logger.error("Payment insert failed", insertRes.error);
//             }

//             return res.json({ ok: true, data: payData });
//         }

//         return res.status(400).json({ msg: "Payment failed", data: payData });

//     } catch (err) {
//         logger.error("verifyPayment error", { error: err.stack || err });
//         return res.status(500).json({ msg: "Payment verify failed", error: err.message });
//     }
// };

