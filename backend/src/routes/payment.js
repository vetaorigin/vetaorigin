
// src/routes/payment.js
import express from "express";
import { initPayment, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

// initialize transaction
router.post("/init", initPayment);

// optional server-side verify
router.get("/verify", verifyPayment);

// webhook endpoint (note: webhook route registered in index.js with raw parser)
export default router;



































