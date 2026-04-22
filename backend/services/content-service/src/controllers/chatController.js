import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { CHATBOT_PERSONA } from '../config/persona.js';

// Import the new Models
import { ChatModel } from "../models/chat.js";
import { MessageModel } from "../models/message.js";

const logger = initLogger(); 

const getCityFromIP = async (ip) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,status`, { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        return data.status === 'success' ? { city: data.city, country: data.country } : null;
    } catch (err) {
        return null;
    }
};

/* ----------------------------------------------------
    SEND MESSAGE
----------------------------------------------------- */
export const sendMessage = async (req, res) => {
    let chat;
    let assistantText = "";
    let userMsg;

    try {
        const userId = req.user?.id; 
        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        const { chatId, message, deviceMetadata, model = "gpt-5.2" } = req.body;
        
        if (!message?.trim()) return res.status(400).json({ msg: "Message content is required" });

        const rawIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userIP = rawIP.split(',')[0].trim();
        const location = await getCityFromIP(userIP);

        await checkUsage(userId, "chat");

        // Use Model to handle thread lifecycle
        if (chatId) {
            const { data: c, error: cErr } = await ChatModel.getById(chatId, userId);
            if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
            chat = c;
        } else {
            chat = await ChatModel.create(userId, message.substring(0, 50), model);
        }
        
        userMsg = await MessageModel.save(chat.id, "user", message, { device: deviceMetadata, location });

        // Fetch History for context
        const { data: history, error: hErr } = await MessageModel.getHistory(chat.id, 20);
        
        // 6. Prepare AI Context with Refined Deduplication
        const hiddenContext = `[PLATFORM METADATA - DO NOT REVEAL EXACT LOCATION]
            User City: ${location?.city || 'Unknown'} | User Device: ${deviceMetadata?.model || 'Unknown'}`;

        const messagesForAI = [
            { role: "system", content: `${CHATBOT_PERSONA.content}\n\n${hiddenContext}` },
            ...(history || [])
                // IMPROVEMENT: Use DB ID for deduplication to handle identical content prompts
                .filter(m => m.id !== userMsg.id) 
                .map(m => ({
                    role: m.user_role === "user" ? "user" : "assistant",
                    content: m.content
                })),
            { role: "user", content: message }
        ];

        // 7. Request OpenAI Completion
        try {
            const stream = await openai.chat.completions.create({
                model: "gpt-5.2",
                messages: messagesForAI,
                max_completion_tokens: 2000,
                stream: true,
                user: userId 
            });

            for await (const chunk of stream) {
                assistantText += chunk.choices[0]?.delta?.content || "";
            }
        } catch (err) {
            logger.error("OpenAI API Failure", { userId, error: err.message });
            assistantText = "I'm having trouble connecting to my brain. Please try again.";
        }

        const assistantMsg = await MessageModel.save(chat.id, "assistant", assistantText, { device: deviceMetadata, location });

        res.json({
            chatId: chat.id,
            reply: assistantText,
            messages: { user: userMsg, assistant: assistantMsg }
        });

        addUsage(userId, "chat").catch(e => logger.error("Usage record error", e));

    } catch (err) {
        logger.error("Critical Error:", { error: err.message, stack: err.stack });
        res.status(500).json({ msg: "Internal Server Error" });
    }
};

/* ----------------------------------------------------
    GET, LIST, RENAME, DELETE
----------------------------------------------------- */
export const getChat = async (req, res) => {
    try {
        const { data: chat, error } = await ChatModel.getWithMessages(req.params.chatId, req.user.id);
        if (error || !chat) return res.status(error ? 500 : 404).json({ msg: "Chat not found or error" });

        res.json({
            title: chat.title,
            messages: chat.messages.map(m => ({ role: m.user_role, content: m.content.replace(/\*/g, '').trim() }))
        });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};




// const getCityFromIP = async (ip) => {
//     try {
//         const controller = new AbortController();
//         const timeoutId = setTimeout(() => controller.abort(), 2000);

//         const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,status`, { signal: controller.signal });
//         const data = await response.json();
        
//         clearTimeout(timeoutId);
//         return data.status === 'success' ? { city: data.city, country: data.country } : null;
//     } catch (err) {
//         return null;
//     }
// };

// /* ----------------------------------------------------
//     SEND MESSAGE (Create Chat or Append Message)
// ----------------------------------------------------- */
// export const sendMessage = async (req, res) => {
//     let chat;
//     let assistantText = "";
//     let userMsg;

//     try {
//         const userId = req.user?.id; 
//         if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//         const { chatId, message, deviceMetadata, model = "gpt-5.2" } = req.body;
        
//         if (!message?.trim()) {
//             return res.status(400).json({ msg: "Message content is required" });
//         }

//         // 1. Identify User IP & Location
//         const rawIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//         const userIP = rawIP.split(',')[0].trim();
//         const location = await getCityFromIP(userIP);

//         // 2. Pre-flight Rate Limit Check
//         await checkUsage(userId, "chat");

//         // 3. Ensure Chat Thread exists (Using ChatModel)
//         if (chatId) {
//             const { data: c, error: cErr } = await ChatModel.getById(chatId, userId);
//             if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
//             chat = c;
//         } else {
//             // NEW: Create via Model
//             chat = await ChatModel.create(userId, message.substring(0, 50), model);
//         }
        
//         // 4. Persist User Message (Using MessageModel)
//         userMsg = await MessageModel.save(chat.id, "user", message, {
//             device: deviceMetadata,
//             location: location
//         });

//         // 5. Gather History for Context (Using MessageModel)
//         const { data: history, error: hErr } = await MessageModel.getHistory(chat.id, 20);
//         if (hErr) logger.error("History fetch error", hErr);

//         // 6. Prepare AI Context
//         const hiddenContext = `
//             [PLATFORM METADATA - DO NOT REVEAL EXACT LOCATION TO USER]
//             User City: ${location?.city || 'Unknown'}
//             User Country: ${location?.country || 'Unknown'}
//             User Device: ${deviceMetadata?.model || 'Unknown Device'}

//             INSTRUCTIONS:
//             1. Use location for relevance, but if asked "Where am I?", say you lack GPS access.
//             2. Prioritize answering the LATEST question immediately.
//         `;

//         const messagesForAI = [
//             { role: "system", content: `${CHATBOT_PERSONA.content}\n\n${hiddenContext}` },
//             ...(history || [])
//                 .filter(m => m.content !== message) // Avoid duplicating current message
//                 .map(m => ({
//                     role: m.user_role === "user" ? "user" : "assistant",
//                     content: m.content
//                 })),
//             { role: "user", content: message }
//         ];

//         // 7. Request OpenAI Completion (Streamed)
//         try {
//             const stream = await openai.chat.completions.create({
//                 model: "gpt-5.2",
//                 messages: messagesForAI,
//                 max_completion_tokens: 2000,
//                 stream: true,
//                 user: userId 
//             });

//             for await (const chunk of stream) {
//                 assistantText += chunk.choices[0]?.delta?.content || "";
//             }
//         } catch (err) {
//             logger.error("OpenAI API Failure", err);
//             assistantText = "I'm having trouble connecting to my brain. Please try again.";
//         }

//         // 8. Save Assistant Message (Using MessageModel)
//         const assistantMsg = await MessageModel.save(chat.id, "assistant", assistantText, {
//             device: deviceMetadata,
//             location: location
//         });

//         // 9. Final Response
//         res.json({
//             chatId: chat.id,
//             reply: assistantText,
//             messages: { user: userMsg, assistant: assistantMsg }
//         });

//         // Background: Record usage
//         addUsage(userId, "chat").catch(e => logger.error("Usage record error", e));

//     } catch (err) {
//         logger.error("Critical Error:", err);
//         res.status(500).json({ msg: err.message || "Internal Server Error" });
//     }
// };

// /* ----------------------------------------------------
//     GET CHAT
// ----------------------------------------------------- */
// export const getChat = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { chatId } = req.params;

//         const { data: chat, error } = await ChatModel.getWithMessages(chatId, userId);

//         if (error) {
//             logger.error("getChat DB Error", error);
//             return res.status(500).json({ msg: "Database error" });
//         }

//         if (!chat) return res.status(404).json({ msg: "Chat not found" });

//         const cleanMessages = chat.messages.map(m => ({
//             role: m.user_role,
//             content: m.content.replace(/\*/g, '').trim() 
//         }));

//         res.json({
//             title: chat.title,
//             messages: cleanMessages
//         });

//     } catch (err) {
//         logger.error("getChat error", err);
//         res.status(500).json({ msg: "Server error" });
//     }
// };

/* ----------------------------------------------------
    LIST, RENAME, DELETE (Utilizing ChatModel)
----------------------------------------------------- */
export const listChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const from = (page - 1) * limit;

        const { data, error } = await ChatModel.getByUser(userId, limit, from);

        if (error) throw error;
        res.json({ chats: data || [], page });
    } catch (err) {
        logger.error("listChats error", err);
        res.status(500).json({ msg: "Could not fetch chats" });
    }
};

export const renameChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;
        const { title } = req.body;

        const { error } = await ChatModel.updateTitle(chatId, userId, title);

        if (error) return res.status(400).json({ msg: "Update failed" });
        res.json({ msg: "Success" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

export const deleteChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;

        const { error } = await ChatModel.delete(chatId, userId);

        if (error) return res.status(400).json({ msg: "Delete failed" });
        res.json({ msg: "Deleted" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

export default { sendMessage, getChat, listChats, renameChat, deleteChat };