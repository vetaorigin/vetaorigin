
// src/routes/payment.js
import express from "express";
import { initPayment, verifyPayment, handlePaystackWebhook } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/authMiddleware.js"; // Ensure this path is correct

const router = express.Router();

// ✅ PROTECTED: Only logged-in users can start a payment
router.post("/init", requireAuth, initPayment);

// ✅ PUBLIC: Paystack redirects users here after payment
router.get("/verify", verifyPayment);

// ✅ PUBLIC: Paystack server calls this in the background
// Note: Webhook must NOT have requireAuth because Paystack doesn't have your JWT
router.post("/webhook", handlePaystackWebhook);

export default router;

// import express from "express";
// import { initPayment, verifyPayment } from "../controllers/paymentController.js";

// const router = express.Router();

// // initialize transaction
// router.post("/init", initPayment);

// // optional server-side verify
// router.get("/verify", verifyPayment);

// // webhook endpoint (note: webhook route registered in index.js with raw parser)
// export default router;



































