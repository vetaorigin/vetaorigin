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
  console.log("DEBUG SESSION:", req.session);
  console.log("DEBUG BODY:", req.body);

  let userMsg = null;
  let assistantMsg = null;
  let chat = null;
  const friendyError = "Sorry — I couldn't generate a response right now.";

  // src/controllers/chatController.js - Add this block near the top of sendMessage

// Check if the key is available and log it directly
if (!process.env.OPENAI_API_KEY) {
    // If the environment variable is missing, log a HUGE warning and return 503
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! FATAL ERROR: OPENAI_API_KEY environment variable is MISSING. !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    return res.status(503).json({ msg: "Server configuration error: AI Key missing.", reply: friendyError });
}
// (The rest of the sendMessage function continues below)

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
    const { data: uMsg, error: userMsgErr } = await supabase
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
    userMsg = uMsg;

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

    // 4️⃣ Call OpenAI (MODIFIED LOGGING BLOCK)
    logger.info("Calling OpenAI", { userId, chatId: chat.id, model });
    let assistantText = friendyError;
    let aiGenerationFailed = false;

    try {
      // Corrected OpenAI call (as implemented in the last step)
      const resp = await openai.chat.completions.create({
        model,
        messages: messagesForOpenAI,
        max_tokens: 1000
      });

      // Defensive parsing
      assistantText = resp.choices?.[0]?.message?.content ?? friendyError;
      
      if (assistantText === friendyError) {
          aiGenerationFailed = true;
      }

    } catch (err) {
      // 🛑 CRITICAL FIX: Use console.error directly and serialize the error
      console.error("### OPENAI API ERROR (MUST CHECK RENDER LOGS):");
      
      // Print the full error object as a JSON string for maximum detail capture
      // Note: OpenAI errors are often plain objects, so JSON.stringify is reliable here.
      console.error(JSON.stringify(err, null, 2)); 
      
      aiGenerationFailed = true;
      assistantText = friendyError;
    }

    // ... (rest of the function continues as before, including the 503 check)

    // 🛑 CRITICAL FIX: If AI failed, return a non-200 status code
    if (aiGenerationFailed) {
        // Return 503 Service Unavailable or 500 Internal Server Error
        return res.status(503).json({ 
            msg: "AI service failed to generate a reply.", 
            reply: assistantText // Still sends the friendly error for display
        });
    }

    // 5️⃣ Save assistant message (Only runs if AI succeeded)
    const { data: aMsg, error: assistantErr } = await supabase
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
    assistantMsg = aMsg;

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
