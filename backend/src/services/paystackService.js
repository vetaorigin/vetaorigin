 // src/services/paystackService.js
import axios from "axios";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

const PAYSTACK_BASE = "https://api.paystack.co";

const getAuthHeader = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json"
});

/**
 * Initialize a transaction
 * Expects amount already in KOBO (from controller)
 */
export async function initializeTransaction({ amount, email, callback_url, metadata = {} }) {
  try {
    // ✅ Remove the extra multiplication here since it's handled in the controller
    // Use Math.round to ensure it's an integer for Paystack
    const finalAmount = Math.round(amount); 

    const resp = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        amount: finalAmount,
        email,
        callback_url,
        metadata
      },
      { headers: getAuthHeader() }
    );
    
    logger.info("Paystack init response", { reference: resp.data?.data?.reference });
    return resp.data; 
  } catch (err) {
    logger.error("Paystack initialize error", err?.response?.data || err.message);
    throw err;
  }
}

/**
 * Verify transaction using reference
 */
export async function verifyTransaction(reference) {
  try {
    const resp = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: getAuthHeader()
    });
    return resp.data;
  } catch (err) {
    logger.error("Paystack verify error", err?.response?.data || err.message);
    throw err;
  }
}


// import axios from "axios";
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// const PAYSTACK_BASE = "https://api.paystack.co";

// const getAuthHeader = () => ({
//   Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//   "Content-Type": "application/json"
// });

// /**
//  * Initialize a transaction
//  * amount: number in Naira (e.g., 1000.50)
//  * planId: your local plan id (uuid) or name
//  * email: buyer's email
//  * callback_url: frontend URL to redirect to (optional)
//  * metadata: object
//  */
// export async function initializeTransaction({ amount, email, callback_url, metadata = {} }) {
//   // Paystack expects amount in kobo (so multiply by 100)
//   const amountKobo = Math.round(Number(amount) * 100);
//   try {
//     const resp = await axios.post(
//       `${PAYSTACK_BASE}/transaction/initialize`,
//       {
//         amount: amountKobo,
//         email,
//         callback_url,
//         metadata
//       },
//       { headers: getAuthHeader() }
//     );
//     logger.info("Paystack init response", resp.data);
//     return resp.data; // contains data.authorization_url, reference
//   } catch (err) {
//     logger.error("Paystack initialize error", err?.response?.data || err.message);
//     throw err;
//   }
// }

// /**
//  * Verify transaction using reference
//  * returns paystack response
//  */
// export async function verifyTransaction(reference) {
//   try {
//     const resp = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
//       headers: getAuthHeader()
//     });
//     logger.info("Paystack verify response", resp.data);
//     return resp.data;
//   } catch (err) {
//     logger.error("Paystack verify error", err?.response?.data || err.message);
//     throw err;
//   }
// }
