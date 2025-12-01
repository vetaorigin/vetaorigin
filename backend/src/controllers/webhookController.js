// controllers/webhookController.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";
import { upsertSubscription } from "./subscriptionController.js";

const logger = initLogger();

export const flutterwaveWebhook = async (req, res) => {
  try {
    const event = req.body;
    logger.info("Received webhook", event);

    if (event.status !== "successful") return res.status(400).send("Ignored");

    const userId = event.customer?.id; // match with your DB
    const plan = event.meta?.plan;
    const durationDays = event.meta?.duration || 30;

    if (!userId || !plan) return res.status(400).send("Invalid webhook");

    await upsertSubscription(userId, plan, durationDays);

    res.status(200).send("Subscription updated");
  } catch (err) {
    logger.error("Webhook processing failed", err);
    res.status(500).send("Webhook error");
  }
};

export default flutterwaveWebhook