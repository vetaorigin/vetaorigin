import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/user.js";
import { initLogger } from "./utils/logger.js";

dotenv.config();
const app = express();
const logger = initLogger();

// Middlewares
app.use(express.json({ limit: "2mb" })); // Sufficient for profile/preference data
app.use(cors());

// Routes
app.use("/user", userRoutes);

// Health Check for Render
app.get("/health", (req, res) => res.json({ status: "user-ok", timestamp: new Date() }));

// Error handling
app.use((err, req, res, next) => {
    logger.error("User Service Error", err);
    res.status(500).json({ msg: "User Service Error", error: err.message });
});

const PORT = process.env.PORT || 3002; // Use a different port than auth-service
app.listen(PORT, () => {
    logger.info(`User Service running on port ${PORT}`);
});