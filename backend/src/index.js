import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

// Route Imports
import authRoutes from "./routes/auth.js";
import ttsRoutes from "./routes/tts.js";
import sttRoutes from "./routes/stt.js";
import s2sRoutes from "./routes/s2s.js";
import chatRoutes from "./routes/chat.js";
import translateRoutes from "./routes/translate.js";
import subscriptionRoutes from "./routes/subscription.js";
import paymentRoutes from "./routes/payment.js";
import paystackWebhook from "./controllers/webhookController.js";
import { initLogger } from "./utils/logger.js";

dotenv.config();
const app = express();
const logger = initLogger();

// -------------------------
// 1. WEBHOOK PARSER (Must come before express.json)
// -------------------------
app.post(
  "/webhook/paystack", 
  express.raw({ type: "application/json" }), 
  paystackWebhook
);

// -------------------------
// 2. STANDARD PARSERS
// -------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -------------------------
// 3. CORS
// -------------------------
app.use(
  cors({
    origin: "*", // Allow mobile apps to connect
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"], // Required for Bearer tokens
  })
);

// -------------------------
// 4. STATIC FILES
// -------------------------
app.use("/public", express.static(path.join(process.cwd(), "public")));

// -------------------------
// 5. ROUTES
// -------------------------
app.use("/auth", authRoutes);
app.use("/tts", ttsRoutes);
app.use("/stt", sttRoutes);
app.use("/s2s", s2sRoutes);
app.use("/chat", chatRoutes);
app.use("/translate", translateRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/payment", paymentRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ msg: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ msg: "Server error", error: err.message });
});

// -------------------------
// 6. START SERVER
// -------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Veta Origin Backend running on port ${PORT} (Stateless JWT Mode)`);
});


























