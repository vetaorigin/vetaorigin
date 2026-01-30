import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "./subscriptionController.js";
import { getPlanUuidByName } from "./paymentController.js"; // Import the helper we fixed
import crypto from "crypto";

const logger = initLogger();

export const paystackWebhook = async (req, res) => {
  try {
    // 1. Security: Verify Paystack Signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Unauthorized Paystack webhook attempt");
      return res.status(401).send("Invalid Signature");
    }

    const event = req.body;

    // 2. Only process successful charges
    if (event.event !== "charge.success") {
      return res.status(200).send("Event ignored");
    }

    const { metadata, reference } = event.data;
    
    // 3. Extract Metadata (Matches our initPayment logic)
    const userId = metadata?.user_id;
    const planName = metadata?.plan_name;

    if (!userId || !planName) {
      logger.error("Paystack Webhook missing metadata", { userId, planName });
      return res.status(200).send("Missing Metadata"); // Send 200 to stop retries
    }

    // 4. Map "Basic" to the actual UUID in your Database
    const planUuid = await getPlanUuidByName(planName);

    if (!planUuid) {
      logger.error("Plan UUID not found for name", { planName });
      return res.status(200).send("Plan not found");
    }

    // 5. Update Database
    await upsertSubscription(userId, planUuid);

    logger.info("Webhook: Subscription updated successfully", { userId, planName, reference });

    // 6. Acknowledge Receipt
    res.status(200).send("Success");

  } catch (err) {
    logger.error("Paystack Webhook Critical Error", err);
    res.status(500).send("Internal Server Error");
  }
};

// // You can keep your Flutterwave one here too...
// export const flutterwaveWebhook = async (req, res) => {
//     // ... your existing FLW code ...
// };

// import { initLogger } from "../utils/logger.js";
// import { upsertSubscription } from "./subscriptionController.js";
// import crypto from "crypto"; // Built-in Node.js library

// const logger = initLogger();

// export const flutterwaveWebhook = async (req, res) => {
//   try {
//     // 1. Security: Verify the Secret Hash
//     // You must set 'FLW_SECRET_HASH' in your Flutterwave Dashboard -> Settings -> Webhooks
//     const secretHash = process.env.FLW_SECRET_HASH;
//     const signature = req.headers["verif-hash"];

//     if (!signature || signature !== secretHash) {
//       logger.warn("Unauthorized webhook attempt blocked");
//       return res.status(401).send("Unauthorized");
//     }

//     const payload = req.body;
//     logger.info("Received Verified Webhook", { event: payload.event, status: payload.data?.status });

//     // 2. Filter for successful charges only
//     // Flutterwave sends different events like 'charge.completed'
//     if (payload.event !== "charge.completed" || payload.data.status !== "successful") {
//       return res.status(200).send("Event ignored"); 
//     }

//     const { data } = payload;

//     // 3. Extract Metadata
//     // When you initiate the payment in Flutter/Backend, you MUST pass these in the 'meta' object
//     const userId = data.meta?.user_id; 
//     const planId = data.meta?.plan_id;
//     const durationDays = data.meta?.duration || 30;

//     if (!userId || !planId) {
//       logger.error("Webhook missing metadata", { userId, planId });
//       return res.status(400).send("Invalid metadata");
//     }

//     // 4. Update Database
//     await upsertSubscription(userId, planId, durationDays);

//     logger.info("Subscription active for user", { userId, planId });

//     // 5. Acknowledge Receipt (Flutterwave needs a 200 OK within seconds)
//     res.status(200).send("Webhook Received");

//   } catch (err) {
//     logger.error("Webhook processing failed", err);
//     // Always return a 200 or 500 quickly so Flutterwave doesn't keep retrying infinitely if it's a code error
//     res.status(500).send("Internal Server Error");
//   }
// };

// export default flutterwaveWebhook;











