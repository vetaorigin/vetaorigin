import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import ttsRoutes from "./routes/tts.js";
import sttRoutes from "./routes/stt.js";
import s2sRoutes from "./routes/s2s.js";
import chatRoutes from "./routes/chat.js";
import translateRoutes from "./routes/translate.js";
import subscriptionRoutes from "./routes/subscription.js";
import paymentRoutes from "./routes/payment.js";
import webhookController from "./controllers/webhookController.js";
import { initLogger } from "./utils/logger.js";

dotenv.config();
const app = express();
const logger = initLogger();

// -------------------------
// 1. CORS (MUST BE FIRST)
// -------------------------
app.use(
  cors({
    origin: "*", // allow all for testing
    credentials: true,
  })
);

// -------------------------
// 2. PARSERS (ONLY ONCE)
// -------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -------------------------
// 3. STATIC FILES
// -------------------------
app.use("/public", express.static(path.join(process.cwd(), "public")));

// -------------------------
// 4. SESSION
// -------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

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

// Webhook (Flutterwave)
app.post("/webhook/flutterwave", webhookController);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 handler
app.use((req, res) => res.status(404).json({ msg: "Not Found" }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ msg: "Server error", error: err.message });
});

// -------------------------
// 6. START SERVER
// -------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`VoiceBridge backend running on port ${PORT}`);
});
