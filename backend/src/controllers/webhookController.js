// // controllers/webhookController.js
// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// import { upsertSubscription } from "./subscriptionController.js";

// const logger = initLogger();

// export const flutterwaveWebhook = async (req, res) => {
//   try {
//     const event = req.body;
//     logger.info("Received webhook", event);

//     if (event.status !== "successful") return res.status(400).send("Ignored");

//     const userId = event.customer?.id; // match with your DB
//     const plan = event.meta?.plan;
//     const durationDays = event.meta?.duration || 30;

//     if (!userId || !plan) return res.status(400).send("Invalid webhook");

//     await upsertSubscription(userId, plan, durationDays);

//     res.status(200).send("Subscription updated");
//   } catch (err) {
//     logger.error("Webhook processing failed", err);
//     res.status(500).send("Webhook error");
//   }
// };

// export default flutterwaveWebhook


import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "./subscriptionController.js";
import crypto from "crypto"; // Built-in Node.js library

const logger = initLogger();

export const flutterwaveWebhook = async (req, res) => {
  try {
    // 1. Security: Verify the Secret Hash
    // You must set 'FLW_SECRET_HASH' in your Flutterwave Dashboard -> Settings -> Webhooks
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers["verif-hash"];

    if (!signature || signature !== secretHash) {
      logger.warn("Unauthorized webhook attempt blocked");
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body;
    logger.info("Received Verified Webhook", { event: payload.event, status: payload.data?.status });

    // 2. Filter for successful charges only
    // Flutterwave sends different events like 'charge.completed'
    if (payload.event !== "charge.completed" || payload.data.status !== "successful") {
      return res.status(200).send("Event ignored"); 
    }

    const { data } = payload;

    // 3. Extract Metadata
    // When you initiate the payment in Flutter/Backend, you MUST pass these in the 'meta' object
    const userId = data.meta?.user_id; 
    const planId = data.meta?.plan_id;
    const durationDays = data.meta?.duration || 30;

    if (!userId || !planId) {
      logger.error("Webhook missing metadata", { userId, planId });
      return res.status(400).send("Invalid metadata");
    }

    // 4. Update Database
    await upsertSubscription(userId, planId, durationDays);

    logger.info("Subscription active for user", { userId, planId });

    // 5. Acknowledge Receipt (Flutterwave needs a 200 OK within seconds)
    res.status(200).send("Webhook Received");

  } catch (err) {
    logger.error("Webhook processing failed", err);
    // Always return a 200 or 500 quickly so Flutterwave doesn't keep retrying infinitely if it's a code error
    res.status(500).send("Internal Server Error");
  }
};

export default flutterwaveWebhook;











