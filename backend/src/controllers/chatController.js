// src/controllers/chatController.js
import { supabase } from "../services/supabaseClient.js";
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";

const logger = initLogger();

/**
 * sendMessage
 * Body: { chatId?, message, model? }
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { chatId, message, model = "gpt-4o" } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ msg: "Message required" });
    }

    // 0️⃣ Rate-limit check for text chat (1 unit per message)
    try {
      await checkUsage(userId, "chat", 1);
    } catch (err) {
      logger.warn("checkUsage blocked", { userId, err: err.message });
      return res.status(429).json({ msg: err.message || "Rate limit exceeded" });
    }

    // 1️⃣ Ensure chat exists (create if no chatId)
    let chat;
    if (chatId) {
      const { data: c, error: cErr } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();
      if (cErr) {
        logger.error("Fetch chat error", cErr);
        return res.status(500).json({ msg: "Could not fetch chat" });
      }
      if (!c) return res.status(404).json({ msg: "Chat not found" });
      if (c.user_id !== userId) return res.status(403).json({ msg: "Forbidden" });
      chat = c;
    } else {
      const { data: newChat, error: newChatErr } = await supabase
        .from("chats")
        .insert([{ user_id: userId, model }])
        .select()
        .maybeSingle();
      if (newChatErr) {
        logger.error("Create chat error", newChatErr);
        return res.status(500).json({ msg: "Could not create chat" });
      }
      chat = newChat;
    }

    // 2️⃣ Persist user message
    const { data: userMsg, error: userMsgErr } = await supabase
      .from("messages")
      .insert([
        {
          chat_id: chat.id,
          user_role: "user",
          content: message
        }
      ])
      .select()
      .maybeSingle();

    if (userMsgErr) {
      logger.error("Insert user message error", userMsgErr);
      // not fatal — continue but warn
    }

    // 3️⃣ Build context: last N messages (including current) — order ascending
    const { data: history, error: historyErr } = await supabase
      .from("messages")
      .select("user_role, content")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .limit(25);

    if (historyErr) {
      logger.warn("Could not fetch history, continuing without context", historyErr);
    }

    const messagesForOpenAI = (history || []).map((m) => {
      return {
        role: m.user_role === "user" ? "user" : (m.user_role === "system" ? "system" : "assistant"),
        content: m.content
      };
    });

    // Append current user message (ensures latest message is included)
    messagesForOpenAI.push({ role: "user", content: message });

    // 4️⃣ Call OpenAI
    logger.info("Calling OpenAI", { userId, chatId: chat.id, model });
    let assistantText = "";
    try {
      // Use the openai client instance from config/openaiConfig.js
      const resp = await openai.chat.completions.generate({
        model,
        messages: messagesForOpenAI,
        max_tokens: 1000
    });

  const assistantText = resp.output_text;


      // defensive parsing
      assistantText = resp?.choices?.[0]?.message?.content ?? "";
      if (!assistantText && typeof resp === "string") assistantText = resp;
    } catch (err) {
      logger.error("OpenAI API error", err);
      console.error("OPENAI ERROR DETAILS:", err);
      // Save error message to assistant content so user sees something
      assistantText = "Sorry — I couldn't generate a response right now.";
    }

    // 5️⃣ Save assistant message
    const { data: assistantMsg, error: assistantErr } = await supabase
      .from("messages")
      .insert([
        {
          chat_id: chat.id,
          user_role: "assistant",
          content: assistantText
        }
      ])
      .select()
      .maybeSingle();

    if (assistantErr) {
      logger.error("Insert assistant message error", assistantErr);
    }

    // 6️⃣ Auto-name chat if missing (first non-empty message trimmed)
    if (!chat.title || chat.title.trim() === "") {
      const candidate = (message || assistantText || "").substring(0, 60).trim();
      if (candidate) {
        const { error: titleErr } = await supabase
          .from("chats")
          .update({ title: candidate })
          .eq("id", chat.id);
        if (titleErr) logger.warn("Could not auto-title chat", titleErr);
      }
    }

    // 7️⃣ Increment usage (text)
    try {
      await addUsage(userId, "chat", 1);
    } catch (err) {
      // log but don't fail the response — user still gets reply
      logger.error("Failed to increment usage", err);
    }

    // 8️⃣ Return assistant reply + chat id
    res.json({
      chatId: chat.id,
      reply: assistantText,
      userMessage: userMsg ?? null,
      assistantMessage: assistantMsg ?? null
    });
  } catch (err) {
    logger.error("sendMessage error", err);
    res.status(500).json({ msg: "Chat error", error: err.message });
  }
};

/**
 * getChat - returns chat metadata + all messages
 */
export const getChat = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { chatId } = req.params;
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (chatErr) {
      logger.error("Fetch chat error", chatErr);
      return res.status(500).json({ msg: "Could not fetch chat" });
    }
    if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("id, user_role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (msgErr) logger.error("Get messages error", msgErr);

    res.json({ chat, messages: messages || [] });
  } catch (err) {
    logger.error("getChat error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * listChats - paginated list of user's chats
 * Query params: ?page=1&limit=20
 */
export const listChats = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      logger.error("listChats error", error);
      return res.status(500).json({ msg: "Could not list chats" });
    }

    res.json({ chats: data || [], page, limit });
  } catch (err) {
    logger.error("listChats error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * renameChat
 */
export const renameChat = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { chatId } = req.params;
    const { title } = req.body;

    if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    if (!title || !title.trim()) return res.status(400).json({ msg: "Title required" });

    // ensure owner
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatErr) {
      logger.error("renameChat fetch error", chatErr);
      return res.status(500).json({ msg: "Could not rename chat" });
    }
    if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

    const { error } = await supabase.from("chats").update({ title }).eq("id", chatId);
    if (error) {
      logger.error("renameChat update error", error);
      return res.status(500).json({ msg: "Could not rename chat" });
    }

    res.json({ msg: "Renamed" });
  } catch (err) {
    logger.error("renameChat error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * deleteChat
 */
export const deleteChat = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { chatId } = req.params;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .maybeSingle();

    if (chatErr) {
      logger.error("deleteChat fetch error", chatErr);
      return res.status(500).json({ msg: "Could not delete chat" });
    }
    if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) {
      logger.error("deleteChat error", error);
      return res.status(500).json({ msg: "Could not delete chat" });
    }

    res.json({ msg: "Deleted" });
  } catch (err) {
    logger.error("deleteChat error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

export default {
  sendMessage,
  getChat,
  listChats,
  renameChat,
  deleteChat
};
