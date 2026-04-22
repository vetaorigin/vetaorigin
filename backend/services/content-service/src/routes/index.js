import express from "express";
import chatRoutes from "./chat.js";
import voiceRoutes from "./voice.js";
import translateRoutes from "./translate.js";

const router = express.Router();

// Mounting the specific route files
router.use("/chat", chatRoutes);
router.use("/voice", voiceRoutes);
router.use("/translate", translateRoutes);

export default router;