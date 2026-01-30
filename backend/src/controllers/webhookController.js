import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "./subscriptionController.js";
import { getPlanUuidByName } from "./paymentController.js";
import crypto from "crypto";

const logger = initLogger();

export const paystackWebhook = async (req, res) => {
  try {
    // 1. Handle the Raw Buffer from express.raw()
    // We need the raw string for the crypto hash and the parsed object for logic
    const rawBody = req.body.toString("utf-8");
    const event = JSON.parse(rawBody);

    // 2. Security: Verify Paystack Signature
    // Important: Use 'rawBody' (string), NOT the parsed 'event' object
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody) 
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Unauthorized Paystack webhook attempt: Signature Mismatch");
      return res.status(401).send("Invalid Signature");
    }

    // 3. Only process successful charges
    if (event.event !== "charge.success") {
      logger.info(`Webhook ignored: ${event.event}`);
      return res.status(200).send("Event ignored");
    }

    const { metadata, reference } = event.data;
    
    // 4. Extract Metadata
    const userId = metadata?.user_id;
    const planName = metadata?.plan_name;

    if (!userId || !planName) {
      logger.error("Paystack Webhook missing metadata", { userId, planName });
      return res.status(200).send("Missing Metadata"); 
    }

    // 5. Map "Basic" (string) to the UUID in your DB
    const planUuid = await getPlanUuidByName(planName);

    if (!planUuid) {
      logger.error("Plan UUID not found for name", { planName });
      return res.status(200).send("Plan not found");
    }

    // 6. Update Database
    const result = await upsertSubscription(userId, planUuid);

    if (!result) {
        throw new Error("Database upsert failed");
    }

    logger.info("Webhook: Subscription updated successfully", { userId, planName, reference });

    // 7. Acknowledge Receipt (Paystack needs a 200 OK)
    res.status(200).send("Success");

  } catch (err) {
    logger.error("Paystack Webhook Critical Error", { error: err.message });
    // Still send 200 if it's a known data error to stop Paystack retries, 
    // or 500 if you want Paystack to try again later.
    res.status(500).send("Internal Server Error");
  }
};


// import { initLogger } from "../utils/logger.js";
// import { upsertSubscription } from "./subscriptionController.js";
// import { getPlanUuidByName } from "./paymentController.js"; // Import the helper we fixed
// import crypto from "crypto";

// const logger = initLogger();

// export const paystackWebhook = async (req, res) => {
//   try {
//     // 1. Security: Verify Paystack Signature
//     const hash = crypto
//       .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
//       .update(JSON.stringify(req.body))
//       .digest("hex");

//     if (hash !== req.headers["x-paystack-signature"]) {
//       logger.warn("Unauthorized Paystack webhook attempt");
//       return res.status(401).send("Invalid Signature");
//     }

//     const event = req.body;

//     // 2. Only process successful charges
//     if (event.event !== "charge.success") {
//       return res.status(200).send("Event ignored");
//     }

//     const { metadata, reference } = event.data;
    
//     // 3. Extract Metadata (Matches our initPayment logic)
//     const userId = metadata?.user_id;
//     const planName = metadata?.plan_name;

//     if (!userId || !planName) {
//       logger.error("Paystack Webhook missing metadata", { userId, planName });
//       return res.status(200).send("Missing Metadata"); // Send 200 to stop retries
//     }

//     // 4. Map "Basic" to the actual UUID in your Database
//     const planUuid = await getPlanUuidByName(planName);

//     if (!planUuid) {
//       logger.error("Plan UUID not found for name", { planName });
//       return res.status(200).send("Plan not found");
//     }

//     // 5. Update Database
//     await upsertSubscription(userId, planUuid);

//     logger.info("Webhook: Subscription updated successfully", { userId, planName, reference });

//     // 6. Acknowledge Receipt
//     res.status(200).send("Success");

//   } catch (err) {
//     logger.error("Paystack Webhook Critical Error", err);
//     res.status(500).send("Internal Server Error");
//   }
// };
