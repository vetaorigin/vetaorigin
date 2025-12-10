// payments/payStack.js
import axios from "axios";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

// --------------------------------------------
// PAYSTACK CONFIG
// --------------------------------------------
const PAYSTACK_BASE = "https://api.paystack.co";

if (!process.env.PAYSTACK_SECRET_KEY) {
  logger.error("Missing Paystack secret key in environment variables");
  throw new Error("PAYSTACK_SECRET_KEY is required");
}

// --------------------------------------------
// HELPER: Prevent circular structure logging
// --------------------------------------------
const safeLog = (data) => {
  try {
    return JSON.stringify(data);
  } catch {
    return "[unserializable-data]";
  }
};

// --------------------------------------------
// INITIATE PAYMENT
// --------------------------------------------
/**
 * Initiate Paystack Payment
 * @param {number} amount - Amount in Naira
 * @param {string} email - User Email
 * @param {string} reference - Unique transaction reference
 * @param {object} metadata - { plan_id, duration_days }
 */
export const initiatePayment = async (amount, email, reference, metadata = {}) => {
  try {
    if (!email || typeof email !== "string") {
      throw new Error("Invalid email provided");
    }

    if (!amount || isNaN(amount)) {
      throw new Error("Invalid amount provided");
    }

    const payload = {
      email,
      amount: amount * 100, // convert Naira to Kobo
      reference,
      metadata,
      callback_url: process.env.PAYSTACK_REDIRECT_URL || "https://yourdomain.com/payment/callback",
    };

    const response = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data.data;

    logger.info(`Paystack Init OK`, {
      reference,
      email,
      amount
    });

    return {
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      reference: data.reference,
    };
  } catch (err) {
    logger.error("Paystack initialize error", {
      message: err?.response?.data?.message || err.message,
      type: err?.response?.data?.code || null,
      meta: safeLog(err?.response?.data),
    });

    throw new Error(err?.response?.data?.message || "Payment initialization error");
  }
};

// --------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------
/**
 * Verify a Paystack transaction
 * @param {string} reference
 */
export const verifyPayment = async (reference) => {
  try {
    if (!reference) throw new Error("Reference is required");

    const response = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = response.data.data;

    logger.info(`Paystack Verify OK`, {
      reference,
      status: data.status,
    });

    return data;
  } catch (err) {
    logger.error("Paystack verify error", {
      message: err?.response?.data?.message || err.message,
      meta: safeLog(err?.response?.data),
    });

    throw new Error("Payment verification failed");
  }
};
