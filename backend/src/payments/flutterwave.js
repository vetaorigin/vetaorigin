// payment/flutterwave.js
import axios from "axios";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

const FLW_BASE = "https://api.flutterwave.com/v3";

if (!process.env.FLW_SECRET_KEY || !process.env.FLW_PUBLIC_KEY) {
  logger.error("Missing Flutterwave keys in environment variables!");
  throw new Error("Flutterwave API keys are required");
}

/**
 * Initiate a Flutterwave payment
 * @param {number} amount
 * @param {string} currency
 * @param {string} customerEmail
 * @param {string} txRef - unique transaction reference
 * @param {object} meta - optional metadata (plan, duration, etc.)
 */
export const initiatePayment = async (amount, currency, customerEmail, txRef, meta = {}) => {
  try {
    const payload = {
      tx_ref: txRef,
      amount,
      currency,
      payment_options: "card,ussd,qr",
      redirect_url: process.env.FLW_REDIRECT_URL || "https://yourdomain.com/payment/callback",
      customer: { email: customerEmail },
      meta,
      customizations: {
        title: "veta origin Subscription",
        description: "Subscription Payment",
      },
    };

    const response = await axios.post(`${FLW_BASE}/payments`, payload, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    });

    logger.info("Payment initiated", { txRef, customerEmail, amount });
    return response.data.data; // contains link to payment page
  } catch (err) {
    logger.error("Flutterwave payment initiation failed", err);
    throw err;
  }
};

/**
 * Verify a Flutterwave payment
 * @param {string} txId - Flutterwave transaction ID
 */
export const verifyPayment = async (txId) => {
  try {
    const response = await axios.get(`${FLW_BASE}/transactions/${txId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    });

    logger.info("Payment verified", { txId, status: response.data.data.status });
    return response.data.data;
  } catch (err) {
    logger.error("Flutterwave payment verification failed", err);
    throw err;
  }
};
