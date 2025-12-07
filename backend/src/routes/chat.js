// src/routes/chat.js
import express from "express";
import {
  sendMessage,
  getChat,
  listChats,
  renameChat,
  deleteChat
} from "../controllers/chatController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireSubscription } from "../middleware/subscriptionMiddleware.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

/**
 * POST /chat
 * Body: { chatId?: string, message: string, model?: string }
 * Creates a new chat if chatId not provided, sends message to OpenAI and returns reply.
 */
router.post("/", requireAuth, requireSubscription, rateLimit("chat"), sendMessage);

/**
 * GET /chat/:chatId
 * Returns chat metadata and messages
 */
router.get("/:chatId", requireAuth, getChat);

/**
 * GET /chat
 * List user's chats
 */
router.get("/", requireAuth, listChats);

/**
 * PATCH /chat/:chatId
 * Body: { title: string }
 */
router.patch("/:chatId", requireAuth, renameChat);

/**
 * DELETE /chat/:chatId
 */
router.delete("/:chatId", requireAuth, deleteChat);

export default router;
