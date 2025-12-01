// index.js
import express from "express";
import session from "express-session";
// import pgSession from "connect-pg-simple";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.js";
import ttsRoutes from "./routes/tts.js";
import sttRoutes from "./routes/stt.js";
import translateRoutes from "./routes/translate.js";
import subscriptionRoutes from "./routes/subscription.js";
import paymentRoutes from "./routes/payment.js";
import webhookController from "./controllers/webhookController.js";
import { initLogger } from "./utils/logger.js";
// import pkg from "pg";
import cors from "cors";

dotenv.config();
const logger = initLogger();
// const { Pool } = pkg;

const app = express();
app.use(express.json({ limit: "10mb" })); // handle large audio payloads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Session setup
// const PgStore = pgSession(session);
// if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
//   logger.error("DATABASE_URL or SESSION_SECRET missing in env!");
//   process.exit(1);
// }
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// app.use(
//   session({
//     store: new PgStore({ pool }),
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//     },
//   })
// );


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
  })
);


app.use(cors({
  origin: process.env.FRONTEND_URL, // for testing only, lock down in production
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// Routes
app.use("/auth", authRoutes);
app.use("/tts", ttsRoutes);
app.use("/stt", sttRoutes);
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

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`VoiceBridge backend running on port ${PORT}`);
});
