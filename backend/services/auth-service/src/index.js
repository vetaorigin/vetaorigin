import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import subscriptionRoutes from "./routes/subscription.js"; // IMPORT THIS
import { initLogger } from "./utils/logger.js";

dotenv.config();
const app = express();
const logger = initLogger();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"], // Added PUT/DELETE for robustness
    allowedHeaders: ["Content-Type", "Authorization", "x-internal-secret"], // ADDED x-internal-secret
}));

// Routes
app.use("/auth", authRoutes);
app.use("/subscription", subscriptionRoutes); // MOUNT THIS

// Health check
app.get("/health", (req, res) => res.json({ status: "auth-ok", timestamp: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
    logger.error("Auth Service Error", err);
    res.status(500).json({ msg: "Authentication Service Error", error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Auth Service running on port ${PORT}`);
});