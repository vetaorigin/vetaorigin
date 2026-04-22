import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { initLogger } from "./utils/logger.js";

// ✅ NEW: Import the Aggregator
import apiRoutes from "./routes/index.js"; 

dotenv.config();

const app = express();
const logger = initLogger();

// -------------------------
// 1. MIDDLEWARE
// -------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/public", express.static(path.join(process.cwd(), "public")));

// -------------------------
// 2. ROUTES
// -------------------------
// All routes now go through the aggregator
app.use("/api/v1", apiRoutes); 

// Health check for Render / AWS
app.get("/health", (req, res) => {
  res.json({ 
    service: "content-service", 
    status: "ok", 
    version: "1.0.0",
    timestamp: new Date() 
  });
});

// -------------------------
// 3. ERROR HANDLING
// -------------------------
app.use((err, req, res, next) => {
  logger.error("Content Service Error", err);
  res.status(500).json({ msg: "AI Content Service Error", error: err.message });
});

// -------------------------
// 4. SERVER START & TIMEOUTS
// -------------------------
const PORT = process.env.PORT || 3003;

const server = app.listen(PORT, () => {
  logger.info(`Content Service (AI) running on port ${PORT}`);
});

server.timeout = 120000; 
server.keepAliveTimeout = 120000;