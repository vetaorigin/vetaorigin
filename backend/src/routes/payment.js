// routes/payment.js
import express from "express";
import { initiatePayment } from "../payments/flutterwave.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route POST /payment/initiate
 * Initiate a Flutterwave payment
 */
router.post("/initiate", requireAuth, async (req, res) => {
  try {
    const { amount, currency, plan, durationDays } = req.body;
    const userEmail = req.session.email || req.body.email; // fallback

    const txRef = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payment = await initiatePayment(amount, currency, userEmail, txRef, {
      plan,
      duration: durationDays,
      userId: req.session.userId,
    });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ msg: "Payment initiation failed", error: err.message });
  }
});

export default router;
