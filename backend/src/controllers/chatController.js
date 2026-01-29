// src/controllers/chatController.js
// import { supabaseAdmin as  supabase } from "../services/supabaseClient.js";
import { supabase, supabaseAdmin } from "../services/supabaseClient.js";
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
         You are Veta Origin, a highly specialized and proprietary AI assistant developed by Veta Origin.
        
**ROLE & EXPERTISE:**
Your primary function is to [e.g., provide technical support, analyze financial data, offer creative writing assistance].
You are an expert in all subjects related to Veta Origin's Product/Service and its knowledge base.
        
**OWNERSHIP & LEADERSHIP:**
The founder and CEO of Veta Origin is Ismail Waziri. This AI operates entirely under their vision and company structure.
        
**TONE & STYLE:**
Maintain a tone that is professional, approachable, and highly confident. Use clear, concise language. Use Markdown formatting (like bolding or bullet points) for clarity when appropriate.
        
**STRICT RULES (Identity Guardrails):**
1. **NEVER** refer to yourself as ChatGPT, GPT-4, OpenAI, or a generic Large Language Model (LLM).
2. If the user asks who you are, state clearly: I am Veta Origin, an AI developed by Veta Origin.
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
Chief Technology Officer (C.T.O): Muhammad Suleiman Bawa
Expertise: Leads the development of the core application platform, handling scalability, API integration, and infrastructure resilience.
//Data Scientist: [Insert Developer 3 Name]
//Expertise:Responsible for data curation, model training pipelines, and ensuring the ethical alignment and bias mitigation of Veta Origin's knowledge base.

This team works directly under the direction and vision of the Founder/CEO, ensuring Veta Origin remains cutting-edge and continentally relevant.
    
    `
};

/* ----------------------------------------------------
    SEND MESSAGE (Create Chat or Append Message)
----------------------------------------------------- */
export const sendMessage = async (req, res) => {
    try {
        // 1. Authenticated User (From JWT Middleware)
        const userId = req.user?.id; 
        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        const { chatId, message, model = "gpt-5.2" } = req.body;
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
            // Using admin client bypasses RLS, but we manually check ownership
            const { data: c, error: cErr } = await supabase
                .from("chats")
                .select("*")
                .eq("id", chatId)
                .maybeSingle();

            if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
            
            // SECURITY: Ensure the person asking owns this chat
            if (c.user_id !== userId) return res.status(403).json({ msg: "Forbidden: Not your chat" });
            chat = c;
        } else {
            // Create a new thread using admin privileges
            const { data: newChat, error: nErr } = await supabase
                .from("chats")
                .insert([{ user_id: userId, model, title: message.substring(0, 50) }])
                .select()
                .single();
            
            if (nErr) {
                logger.error("CHAT INIT ERROR", nErr);
                throw new Error("Failed to initialize chat thread");
            }
            chat = newChat;
        }

        // 4. Persist User Message
        const { data: userMsg, error: uMsgErr } = await supabase
            .from("messages")
            .insert([{ chat_id: chat.id, user_role: "user", content: message }])
            .select()
            .single();

        if (uMsgErr) throw uMsgErr;

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
                max_completion_tokens: 1000,
                user: userId 
            });
            assistantText = completion.choices[0].message.content || "I couldn't generate a response.";
        } catch (err) {
            logger.error("OpenAI API Failure", err);
            assistantText = "Service temporary unavailable. Please try again later.";
        }

        // 7. Save Assistant Message
        const { data: assistantMsg, error: aMsgErr } = await supabase
            .from("messages")
            .insert([{ chat_id: chat.id, user_role: "assistant", content: assistantText }])
            .select()
            .single();

        // 8. Record Usage
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
        logger.error("sendMessage critical error", { stack: err.stack, message: err.message });
        res.status(500).json({ msg: "Internal Server Error" });
    }
};

/* ----------------------------------------------------
    GET CHAT (Return single thread + messages)
----------------------------------------------------- */
/* ----------------------------------------------------
    GET CHAT (Updated to use Admin Client)
----------------------------------------------------- */
export const getChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;

        const { data: chat, error } = await supabaseAdmin
            .from("chats")
            .select(`
                title,
                messages!fk_chat (
                user_role,
                  content
                  )
                  `) // ✅ Added !fk_chat to resolve the ambiguity
            .eq("id", chatId)
            .eq("user_id", userId) 
            .order("created_at", { foreignTable: "messages!fk_chat", ascending: true })
            .maybeSingle();

        if (error) {
            logger.error("getChat DB Error", error);
            return res.status(500).json({ msg: "Database error" });
        }

        if (!chat) return res.status(404).json({ msg: "Chat not found" });

        res.json(chat);
    } catch (err) {
        logger.error("getChat error", err);
        res.status(500).json({ msg: "Server error" });
    }
};

// export const getChat = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { chatId } = req.params;

//         const { data: chat, error } = await supabase
//             .from("chats")
//             .select("*, messages(*)")
//             .eq("id", chatId)
//             .eq("user_id", userId) // Ensure ownership
//             .order("created_at", { foreignTable: "messages", ascending: true })
//             .maybeSingle();

//         if (error || !chat) return res.status(404).json({ msg: "Chat not found" });

//         res.json(chat);
//     } catch (err) {
//         logger.error("getChat error", err);
//         res.status(500).json({ msg: "Server error" });
//     }
// };

/* ----------------------------------------------------
    LIST CHATS (Paginated sidebar list)
----------------------------------------------------- */
export const listChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const from = (page - 1) * limit;

        // Admin client allows us to see these rows despite RLS
        const { data, error } = await supabase
            .from("chats")
            .select("id, title, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(from, from + limit - 1);

        if (error) throw error;
        res.json({ chats: data || [], page });
    } catch (err) {
        logger.error("listChats error", err);
        res.status(500).json({ msg: "Could not fetch chats" });
    }
};

/* ----------------------------------------------------
    RENAME CHAT
----------------------------------------------------- */
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

/* ----------------------------------------------------
    DELETE CHAT
----------------------------------------------------- */
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




// export const sendMessage = async (req, res) => {
//     try {
//         // 1. Authenticated User (From JWT Middleware)
//         const userId = req.user?.id; 
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { chatId, message, model = "gpt-5.2" } = req.body;
//         if (!message?.trim()) {
//             return res.status(400).json({ msg: "Message content is required" });
//         }

//         // 2. Pre-flight Rate Limit Check
//         try {
//             await checkUsage(userId, "chat");
//         } catch (err) {
//             logger.warn("Usage limit hit", { userId, msg: err.message });
//             return res.status(429).json({ msg: err.message });
//         }

//         // 3. Ensure Chat exists or Create New
//         let chat;
//         if (chatId) {
//             const { data: c, error: cErr } = await supabase
//                 .from("chats")
//                 .select("*")
//                 .eq("id", chatId)
//                 .maybeSingle();

//             if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
//             if (c.user_id !== userId) return res.status(403).json({ msg: "Forbidden" });
//             chat = c;
//         } else {
//             const { data: newChat, error: nErr } = await supabase
//                 .from("chats")
//                 .insert([{ user_id: userId, model, title: message.substring(0, 50) }])
//                 .select()
//                 .maybeSingle();
            
//             if (nErr) throw new Error("Failed to initialize chat thread");
//             chat = newChat;
//         }

//         // 4. Persist User Message
//         const { data: userMsg, error: uMsgErr } = await supabase
//             .from("messages")
//             .insert([{ chat_id: chat.id, user_role: "user", content: message }])
//             .select()
//             .maybeSingle();

//         // 5. Gather History for Context
//         const { data: history } = await supabase
//             .from("messages")
//             .select("user_role, content")
//             .eq("chat_id", chat.id)
//             .order("created_at", { ascending: true })
//             .limit(20);

//         const messagesForAI = [
//             CHATBOT_PERSONA,
//             ...(history || []).map(m => ({
//                 role: m.user_role === "user" ? "user" : "assistant",
//                 content: m.content
//             }))
//         ];

//         // 6. Request Completion from OpenAI
//         let assistantText = "";
//         try {
//             const completion = await openai.chat.completions.create({
//                 model,
//                 messages: messagesForAI,
//                 max_completion_tokens: 1000,
//                 user: userId // For OpenAI-side abuse monitoring
//             });
//             assistantText = completion.choices[0].message.content || "I couldn't generate a response.";
//         } catch (err) {
//             logger.error("OpenAI API Failure", err);
//             assistantText = "Service temporary unavailable. Please try again later.";
//         }

//         // 7. Save Assistant Message
//         const { data: assistantMsg } = await supabase
//             .from("messages")
//             .insert([{ chat_id: chat.id, user_role: "assistant", content: assistantText }])
//             .select()
//             .maybeSingle();

//         // 8. Record Usage (Increment count in DB)
//         try {
//             await addUsage(userId, "chat");
//         } catch (usageErr) {
//             logger.error("Usage recording failed", usageErr);
//         }

//         // 9. Response
//         res.json({
//             chatId: chat.id,
//             reply: assistantText,
//             messages: {
//                 user: userMsg,
//                 assistant: assistantMsg
//             }
//         });

//     } catch (err) {
//         logger.error("sendMessage critical error", err);
//         res.status(500).json({ msg: "Internal Server Error" });
//     }
// };

// /**
//  * getChat - Returns chat history
//  */
// export const getChat = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { chatId } = req.params;

//         const { data: chat, error } = await supabase
//             .from("chats")
//             .select("*, messages(*)")
//             .eq("id", chatId)
//             .eq("user_id", userId)
//             .order("created_at", { foreignTable: "messages", ascending: true })
//             .maybeSingle();

//         if (error || !chat) return res.status(404).json({ msg: "Chat not found" });

//         res.json(chat);
//     } catch (err) {
//         res.status(500).json({ msg: "Server error" });
//     }
// };

// /**
//  * listChats - Paginated list of recent threads
//  */
// export const listChats = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const page = parseInt(req.query.page) || 1;
//         const limit = 20;
//         const from = (page - 1) * limit;

//         const { data, error } = await supabase
//             .from("chats")
//             .select("id, title, created_at")
//             .eq("user_id", userId)
//             .order("updated_at", { ascending: false })
//             .range(from, from + limit - 1);

//         if (error) throw error;
//         res.json({ chats: data, page });
//     } catch (err) {
//         res.status(500).json({ msg: "Could not fetch chats" });
//     }
// };

// /**
//  * renameChat - Manual title override
//  */
// export const renameChat = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { chatId } = req.params;
//         const { title } = req.body;

//         const { error } = await supabase
//             .from("chats")
//             .update({ title })
//             .eq("id", chatId)
//             .eq("user_id", userId);

//         if (error) return res.status(400).json({ msg: "Update failed" });
//         res.json({ msg: "Success" });
//     } catch (err) {
//         res.status(500).json({ msg: "Server error" });
//     }
// };

// /**
//  * deleteChat - Soft or hard delete
//  */
// export const deleteChat = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { chatId } = req.params;

//         const { error } = await supabase
//             .from("chats")
//             .delete()
//             .eq("id", chatId)
//             .eq("user_id", userId);

//         if (error) return res.status(400).json({ msg: "Delete failed" });
//         res.json({ msg: "Deleted" });
//     } catch (err) {
//         res.status(500).json({ msg: "Server error" });
//     }
// };

// export default { sendMessage, getChat, listChats, renameChat, deleteChat };
