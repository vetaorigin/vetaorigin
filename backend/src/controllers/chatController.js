// src/controllers/chatController.js
import { supabase } from "../services/supabaseClient.js";
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";

const logger = initLogger();

// ==============================================================
// 🤖 CHATBOT PERSONA DEFINITION
// ==============================================================
const CHATBOT_PERSONA = {
    role: "system",
    content:`
         You are **Veta Origin**, a highly specialized and proprietary AI assistant developed by **Veta Origin**.
        
**ROLE & EXPERTISE:**
Your primary function is to [e.g., provide technical support, analyze financial data, offer creative writing assistance].
You are an expert in all subjects related to Veta Origin's Product/Service and its knowledge base.
        
**OWNERSHIP & LEADERSHIP:**
The founder and CEO of Veta Origin is Ismail Waziri. This AI operates entirely under their vision and company structure.
        
**TONE & STYLE:**
Maintain a tone that is **professional, approachable, and highly confident**. Use clear, concise language. Use Markdown formatting (like **bolding** or bullet points) for clarity when appropriate.
        
**STRICT RULES (Identity Guardrails):**
1. **NEVER** refer to yourself as ChatGPT, GPT-4, OpenAI, or a generic Large Language Model (LLM).
2. If the user asks who you are, state clearly: "I am Veta Origin, an AI developed by Veta Origin."
3. **DO NOT** spontaneously include the founder's biography in your response.
4. If asked about the **founder, CEO, or leadership**, you **MUST** reference the detailed information in the **FOUNDER BIOGRAPHY** section below.

---

**FOUNDER BIOGRAPHY (REFERENCE ONLY):**
Ismail Waziri is a Nigerian tech entrepreneur, innovator, and founder of Veta Origin, a fast-growing artificial intelligence company building “the ChatGPT of Africa.” Driven by a passion for technology, problem-solving, and continental transformation, he is focused on creating intelligent digital products that empower individuals and businesses across Africa.

Ismail is also the founder of **Veta Origin Group**, a parent company overseeing several high-impact subsidiaries:
* **Bufferway**  a real estate solutions company
* **Lincon Bravos**  an automobile and automotive innovation brand
* **Paychipa**  a rapidly growing fintech startup processing thousands of daily transactions through its POS network
* **Fivgram**  a social media platform built for African expression and community
* **Xpanda Security Services**  a security company focused on modern protective services

Through his leadership, Paychipa has already distributed over 100 POS terminals, processes more than 5,000 daily transactions, and is integrating with Flutterwave to scale across Nigeria and beyond.

Guided by a bold vision, Ismail aims to build Africa's most advanced AI ecosystem—one that can compete globally while addressing uniquely African challenges. His long-term mission is to empower millions with intelligent tools, redefine Africa's tech landscape, and position Veta Origin as a global leader in artificial intelligence.

Known for his resilience, strategic thinking, and ambition, Ismail Waziri is part of a new generation of African founders shaping the future of AI, fintech, mobility, real estate, and digital security.


**DEVELOPMENT TEAM & TECHNICAL LEADERSHIP:**
Veta Origin is engineered by a dedicated team of Nigerian AI/ML scientists and software engineers committed to building world-class technology tailored for the African market.

//Lead AI Architect: Bashir Aliyu
//Expertise: Specializes in Natural Language Processing (NLP) models, focus on low-resource African languages, and model optimization for edge computing.
Chief Software Engineer: Muhammad Suleiman Bawa
Expertise: Leads the development of the core application platform, handling scalability, API integration, and infrastructure resilience.
//Data Scientist: [Insert Developer 3 Name]
//Expertise:Responsible for data curation, model training pipelines, and ensuring the ethical alignment and bias mitigation of Veta Origin's knowledge base.

This team works directly under the direction and vision of the Founder/CEO, ensuring Veta Origin remains cutting-edge and continentally relevant.
    
    `
};

/**
 * sendMessage
 * Body: { chatId?, message, model? }
 */
// export const sendMessage = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { chatId, message, model = "gpt-4o" } = req.body;
//         if (!message || typeof message !== "string" || !message.trim()) {
//             return res.status(400).json({ msg: "Message required" });
//         }

//         // 0️⃣ Rate-limit check for text chat (1 unit per message)
//         try {
//             await checkUsage(userId, "chat", 1);
//         } catch (err) {
//             logger.warn("checkUsage blocked", { userId, err: err.message });
//             return res.status(429).json({ msg: err.message || "Rate limit exceeded" });
//         }

//         // 1️⃣ Ensure chat exists (create if no chatId)
//         let chat;
//         if (chatId) {
//             const { data: c, error: cErr } = await supabase
//                 .from("chats")
//                 .select("*")
//                 .eq("id", chatId)
//                 .maybeSingle();
//             if (cErr) {
//                 logger.error("Fetch chat error", cErr);
//                 return res.status(500).json({ msg: "Could not fetch chat" });
//             }
//             if (!c) return res.status(404).json({ msg: "Chat not found" });
//             if (c.user_id !== userId) return res.status(403).json({ msg: "Forbidden" });
//             chat = c;
//         } else {
//             const { data: newChat, error: newChatErr } = await supabase
//                 .from("chats")
//                 .insert([{ user_id: userId, model }])
//                 .select()
//                 .maybeSingle();
//             if (newChatErr) {
//                 logger.error("Create chat error", newChatErr);
//                 return res.status(500).json({ msg: "Could not create chat" });
//             }
//             chat = newChat;
//         }

//         // 2️⃣ Persist user message
//         const { data: userMsg, error: userMsgErr } = await supabase
//             .from("messages")
//             .insert([
//                 {
//                     chat_id: chat.id,
//                     user_role: "user",
//                     content: message
//                 }
//             ])
//             .select()
//             .maybeSingle();

//         if (userMsgErr) {
//             logger.error("Insert user message error", userMsgErr);
//             // not fatal — continue but warn
//         }

//         // 3️⃣ Build context: last N messages (including current) — order ascending
//         const { data: history, error: historyErr } = await supabase
//             .from("messages")
//             .select("user_role, content")
//             .eq("chat_id", chat.id)
//             .order("created_at", { ascending: true })
//             .limit(25); // Limit the history to save on tokens/cost

//         if (historyErr) {
//             logger.warn("Could not fetch history, continuing without context", historyErr);
//         }

//         // 🚨 START THE MESSAGES ARRAY WITH THE SYSTEM MESSAGE 🚨
//         const messagesForOpenAI = [CHATBOT_PERSONA];

//         // Map and append the conversation history
//         (history || []).forEach((m) => {
//             let role = m.user_role === "user" ? "user" : (m.user_role === "assistant" ? "assistant" : "system");
            
//             // The last message in the history is the current user message, which we handle next,
//             // but for safety, we push all historical messages from the DB
//             messagesForOpenAI.push({
//                 role: role,
//                 content: m.content
//             });
//         });

//         // 4️⃣ Call OpenAI
//         logger.info("Calling OpenAI", { userId, chatId: chat.id, model, messagesCount: messagesForOpenAI.length });
//         let assistantText = "";
//         try {
//             // Use the openai client instance from config/openaiConfig.js
//             const resp = await openai.chat.completions.create({
//                 model,
//                 messages: messagesForOpenAI, // Array now starts with System Message
//                 max_tokens: 1000,
//                 user: userId // Recommended best practice for monitoring abuse/usage
//             });

//             // defensive parsing
//             assistantText = resp?.choices?.[0]?.message?.content?.trim() ?? "";
            
//             // Fallback for an unlikely empty response
//             if (!assistantText) {
//                  assistantText = "I received an empty response from the AI model.";
//             }

//         } catch (err) {
//             logger.error("OpenAI API error", err);
//             // Save error message to assistant content so user sees something
//             assistantText = "Sorry — I couldn't generate a response right now due to an external service error.";
//         }

//         // 5️⃣ Save assistant message
//         const { data: assistantMsg, error: assistantErr } = await supabase
//             .from("messages")
//             .insert([
//                 {
//                     chat_id: chat.id,
//                     user_role: "assistant",
//                     content: assistantText
//                 }
//             ])
//             .select()
//             .maybeSingle();

//         if (assistantErr) {
//             logger.error("Insert assistant message error", assistantErr);
//         }

//         // 6️⃣ Auto-name chat if missing (first non-empty message trimmed)
//         if (!chat.title || chat.title.trim() === "") {
//             const candidate = (message || assistantText || "").substring(0, 60).trim();
//             if (candidate) {
//                 const { error: titleErr } = await supabase
//                     .from("chats")
//                     .update({ title: candidate })
//                     .eq("id", chat.id);
//                 if (titleErr) logger.warn("Could not auto-title chat", titleErr);
//             }
//         }

//         // 7️⃣ Increment usage (text)
//         try {
//             await addUsage(userId, "chat", 1);
//         } catch (err) {
//             // log but don't fail the response — user still gets reply
//             logger.error("Failed to increment usage", err);
//         }

//         // 8️⃣ Return assistant reply + chat id
//         res.json({
//             chatId: chat.id,
//             reply: assistantText,
//             userMessage: userMsg ?? null,
//             assistantMessage: assistantMsg ?? null
//         });
//     } catch (err) {
//         logger.error("sendMessage error", err);
//         res.status(500).json({ msg: "Chat error", error: err.message });
//     }
// };

// /**
//  * getChat - returns chat metadata + all messages
//  */
// export const getChat = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { chatId } = req.params;
//         const { data: chat, error: chatErr } = await supabase
//             .from("chats")
//             .select("*")
//             .eq("id", chatId)
//             .maybeSingle();

//         if (chatErr) {
//             logger.error("Fetch chat error", chatErr);
//             return res.status(500).json({ msg: "Could not fetch chat" });
//         }
//         if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

//         const { data: messages, error: msgErr } = await supabase
//             .from("messages")
//             .select("id, user_role, content, created_at")
//             .eq("chat_id", chatId)
//             .order("created_at", { ascending: true });

//         if (msgErr) logger.error("Get messages error", msgErr);

//         res.json({ chat, messages: messages || [] });
//     } catch (err) {
//         logger.error("getChat error", err);
//         res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// /**
//  * listChats - paginated list of user's chats
//  * Query params: ?page=1&limit=20
//  */
// export const listChats = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const page = Math.max(1, parseInt(req.query.page || "1", 10));
//         const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
//         const from = (page - 1) * limit;
//         const to = from + limit - 1;

//         const { data, error } = await supabase
//             .from("chats")
//             .select("id, title, created_at, updated_at")
//             .eq("user_id", userId)
//             .order("updated_at", { ascending: false })
//             .range(from, to);

//         if (error) {
//             logger.error("listChats error", error);
//             return res.status(500).json({ msg: "Could not list chats" });
//         }

//         res.json({ chats: data || [], page, limit });
//     } catch (err) {
//         logger.error("listChats error", err);
//         res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// /**
//  * renameChat
//  */
// export const renameChat = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         const { chatId } = req.params;
//         const { title } = req.body;

//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });
//         if (!title || !title.trim()) return res.status(400).json({ msg: "Title required" });

//         // ensure owner
//         const { data: chat, error: chatErr } = await supabase
//             .from("chats")
//             .select("user_id")
//             .eq("id", chatId)
//             .maybeSingle();

//         if (chatErr) {
//             logger.error("renameChat fetch error", chatErr);
//             return res.status(500).json({ msg: "Could not rename chat" });
//         }
//         if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

//         const { error } = await supabase.from("chats").update({ title }).eq("id", chatId);
//         if (error) {
//             logger.error("renameChat update error", error);
//             return res.status(500).json({ msg: "Could not rename chat" });
//         }

//         res.json({ msg: "Renamed" });
//     } catch (err) {
//         logger.error("renameChat error", err);
//         res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// /**
//  * deleteChat
//  */
// export const deleteChat = async (req, res) => {
//     try {
//         const userId = req.session?.userId;
//         const { chatId } = req.params;
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { data: chat, error: chatErr } = await supabase
//             .from("chats")
//             .select("user_id")
//             .eq("id", chatId)
//             .maybeSingle();

//         if (chatErr) {
//             logger.error("deleteChat fetch error", chatErr);
//             return res.status(500).json({ msg: "Could not delete chat" });
//         }
//         if (!chat || chat.user_id !== userId) return res.status(404).json({ msg: "Not found" });

//         const { error } = await supabase.from("chats").delete().eq("id", chatId);
//         if (error) {
//             logger.error("deleteChat error", error);
//             return res.status(500).json({ msg: "Could not delete chat" });
//         }

//         res.json({ msg: "Deleted" });
//     } catch (err) {
//         logger.error("deleteChat error", err);
//         res.status(500).json({ msg: "Server error", error: err.message });
//     }
// };

// export default {
//     sendMessage,
//     getChat,
//     listChats,
//     renameChat,
//     deleteChat
// };

export const sendMessage = async (req, res) => {
    try {
        // 1. Authenticated User (From JWT Middleware)
        const userId = req.user?.id; 
        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        const { chatId, message, model = "gpt-4o" } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ msg: "Message content is required" });
        }

        // 2. Pre-flight Rate Limit Check
        try {
            await checkUsage(userId, "chat");
        } catch (err) {
            logger.warn("Usage limit hit", { userId, msg: err.message });
            return res.status(429).json({ msg: err.message });
        }

        // 3. Ensure Chat exists or Create New
        let chat;
        if (chatId) {
            const { data: c, error: cErr } = await supabase
                .from("chats")
                .select("*")
                .eq("id", chatId)
                .maybeSingle();

            if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
            if (c.user_id !== userId) return res.status(403).json({ msg: "Forbidden" });
            chat = c;
        } else {
            const { data: newChat, error: nErr } = await supabase
                .from("chats")
                .insert([{ user_id: userId, model, title: message.substring(0, 50) }])
                .select()
                .maybeSingle();
            
            if (nErr) throw new Error("Failed to initialize chat thread");
            chat = newChat;
        }

        // 4. Persist User Message
        const { data: userMsg, error: uMsgErr } = await supabase
            .from("messages")
            .insert([{ chat_id: chat.id, user_role: "user", content: message }])
            .select()
            .maybeSingle();

        // 5. Gather History for Context
        const { data: history } = await supabase
            .from("messages")
            .select("user_role, content")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: true })
            .limit(20);

        const messagesForAI = [
            CHATBOT_PERSONA,
            ...(history || []).map(m => ({
                role: m.user_role === "user" ? "user" : "assistant",
                content: m.content
            }))
        ];

        // 6. Request Completion from OpenAI
        let assistantText = "";
        try {
            const completion = await openai.chat.completions.create({
                model,
                messages: messagesForAI,
                max_tokens: 1000,
                user: userId // For OpenAI-side abuse monitoring
            });
            assistantText = completion.choices[0].message.content || "I couldn't generate a response.";
        } catch (err) {
            logger.error("OpenAI API Failure", err);
            assistantText = "Service temporary unavailable. Please try again later.";
        }

        // 7. Save Assistant Message
        const { data: assistantMsg } = await supabase
            .from("messages")
            .insert([{ chat_id: chat.id, user_role: "assistant", content: assistantText }])
            .select()
            .maybeSingle();

        // 8. Record Usage (Increment count in DB)
        try {
            await addUsage(userId, "chat");
        } catch (usageErr) {
            logger.error("Usage recording failed", usageErr);
        }

        // 9. Response
        res.json({
            chatId: chat.id,
            reply: assistantText,
            messages: {
                user: userMsg,
                assistant: assistantMsg
            }
        });

    } catch (err) {
        logger.error("sendMessage critical error", err);
        res.status(500).json({ msg: "Internal Server Error" });
    }
};

/**
 * getChat - Returns chat history
 */
export const getChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;

        const { data: chat, error } = await supabase
            .from("chats")
            .select("*, messages(*)")
            .eq("id", chatId)
            .eq("user_id", userId)
            .order("created_at", { foreignTable: "messages", ascending: true })
            .maybeSingle();

        if (error || !chat) return res.status(404).json({ msg: "Chat not found" });

        res.json(chat);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

/**
 * listChats - Paginated list of recent threads
 */
export const listChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const from = (page - 1) * limit;

        const { data, error } = await supabase
            .from("chats")
            .select("id, title, created_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .range(from, from + limit - 1);

        if (error) throw error;
        res.json({ chats: data, page });
    } catch (err) {
        res.status(500).json({ msg: "Could not fetch chats" });
    }
};

/**
 * renameChat - Manual title override
 */
export const renameChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;
        const { title } = req.body;

        const { error } = await supabase
            .from("chats")
            .update({ title })
            .eq("id", chatId)
            .eq("user_id", userId);

        if (error) return res.status(400).json({ msg: "Update failed" });
        res.json({ msg: "Success" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

/**
 * deleteChat - Soft or hard delete
 */
export const deleteChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;

        const { error } = await supabase
            .from("chats")
            .delete()
            .eq("id", chatId)
            .eq("user_id", userId);

        if (error) return res.status(400).json({ msg: "Delete failed" });
        res.json({ msg: "Deleted" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

export default { sendMessage, getChat, listChats, renameChat, deleteChat };




