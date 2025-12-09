// src/controllers/chatController.js (CORRECTED)
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

  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ msg: "Unauthorized" });

    const { chatId, message, model = "gpt-4o" } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ msg: "Message required" });
    }

    // 0️⃣ Rate-limit check
    try {
      await checkUsage(userId, "chat", 1);
    } catch (err) {
      logger.warn("checkUsage blocked", { userId, err: err.message });
      return res.status(429).json({ msg: err.message || "Rate limit exceeded" });
    }

    // 1️⃣ Ensure chat exists
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
    }
    userMsg = uMsg;

    // 3️⃣ Build context
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

    // Append current user message
    messagesForOpenAI.push({ role: "user", content: message });

    // 4️⃣ Call OpenAI (CORRECTED BLOCK)
    logger.info("Calling OpenAI", { userId, chatId: chat.id, model });
    let assistantText = friendyError; // Default to error message
    let aiGenerationFailed = false;

    try {
      const resp = await openai.chat.completions.create({ // CORRECTED client method
        model,
        messages: messagesForOpenAI, // CORRECTED key
        max_tokens: 1000 // CORRECTED key
      });

      // Defensive parsing
      assistantText = resp.choices?.[0]?.message?.content ?? friendyError;
      
      // If the response is still the friendly error, flag it as a failure
      if (assistantText === friendyError) {
          aiGenerationFailed = true;
      }

    } catch (err) {
      logger.error("OpenAI API error. Check API Key validity/rate limits.", err);
      aiGenerationFailed = true;
      assistantText = friendyError;
    }

    // 🛑 CRITICAL NEW STEP: Check if AI failed and terminate the request
    if (aiGenerationFailed) {
        // Send a 503 Service Unavailable or 500 Internal Server Error
        // This will trigger the DioError/non-200 handling in your Flutter client
        return res.status(503).json({ 
            msg: "AI service failed to generate a reply.", 
            reply: assistantText // Send the friendly text too, just in case
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

    // 6️⃣ Auto-name chat
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

    // 7️⃣ Increment usage
    try {
      await addUsage(userId, "chat", 1);
    } catch (err) {
      logger.error("Failed to increment usage", err);
    }

    // 8️⃣ Return assistant reply + chat id
    res.json({
      chatId: chat.id,
      reply: assistantText,
      userMessage: userMsg,
      assistantMessage: assistantMsg
    });
  } catch (err) {
    // This is for unexpected, general errors (DB connection lost, etc.)
    logger.error("sendMessage error", err);
    res.status(500).json({ msg: "Internal server error", error: err.message });
  }
};


// ... rest of the functions (getChat, listChats, renameChat, deleteChat) ...
// The rest of your code remains unchanged.

export default {
  sendMessage,
  getChat,
  listChats,
  renameChat,
  deleteChat
};
