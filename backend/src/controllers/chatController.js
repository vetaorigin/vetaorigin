// src/controllers/chatController.js
// import { supabaseAdmin as  supabase } from "../services/supabaseClient.js";
import { supabase, supabaseAdmin } from "../services/supabaseClient.js";
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";
import { checkUsage, addUsage } from "../utils/rateLimiter.js";
import { CHATBOT_PERSONA } from '../config/persona.js';
const logger = initLogger(); 


const getCityFromIP = async (ip) => {
    try {
        // Render usually provides the user IP in x-forwarded-for
        // Use a 2-second timeout to ensure AI response isn't delayed if the geo-service is slow
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
    SEND MESSAGE (Create Chat or Append Message)
----------------------------------------------------- */
export const sendMessage = async (req, res) => {
    let chat;
    let assistantText = "";
    let userMsg;

    try {
        const userId = req.user?.id; 
        if (!userId) return res.status(401).json({ msg: "Unauthorized" });

        // UPDATED: Use a real model name. "gpt-5.2" will cause an API error.
        const { chatId, message, deviceMetadata, model = "gpt-5.2" } = req.body;
        
        if (!message?.trim()) {
            return res.status(400).json({ msg: "Message content is required" });
        }

        // 2. Identify User IP & Location
        const rawIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userIP = rawIP.split(',')[0].trim();
        const location = await getCityFromIP(userIP);

        // 3. Unlimited Usage Phase
        // We comment this out to allow unlimited messages for now.
        // await checkUsage(userId, "chat"); 

        // 4. Ensure Chat Thread exists
        // If chatId is null (from a fresh login), this logic creates a NEW thread automatically.
        if (chatId) {
            const { data: c, error: cErr } = await supabase
                .from("chats")
                .select("*")
                .eq("id", chatId)
                .eq("user_id", userId) 
                .maybeSingle();

            if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
            chat = c;
        } else {
            // NEW CHAT CREATION: Triggered when user first logs in or clicks "New Chat"
            const { data: newChat, error: nErr } = await supabase
                .from("chats")
                .insert([{ user_id: userId, model, title: message.substring(0, 50) }])
                .select().single();
            
            if (nErr) throw new Error("Failed to initialize chat thread");
            chat = newChat;
        }

        // 5. Persist User Message
        const { data: savedUserMsg, error: uMsgErr } = await supabase
            .from("messages")
            .insert([{ 
                chat_id: chat.id, 
                user_role: "user", 
                content: message,
                device_info: deviceMetadata || {},
                location: location || {}
            }])
            .select().single();

        if (uMsgErr) throw uMsgErr;
        userMsg = savedUserMsg;

        // 6. Gather History
        const { data: history, error: hErr } = await supabase
            .from("messages")
            .select("user_role, content")
            .eq("chat_id", chat.id)
            .neq("id", userMsg.id) // Better than checking content equality
            .order("created_at", { ascending: true })
            .limit(20); 

        if (hErr) console.error("History fetch error", hErr);

        // 7. Prepare AI Context
        const hiddenContext = `
            [PLATFORM METADATA]
            User City: ${location?.city || 'Unknown'}
            User Country: ${location?.country || 'Unknown'}
            User Device: ${deviceMetadata?.model || 'Unknown Device'}

            INSTRUCTIONS:
            1. Use location for relevance, but don't reveal exact coordinates.
            2. Prioritize answering the LATEST question immediately.
        `;

        const messagesForAI = [
            { role: "system", content: `${CHATBOT_PERSONA.content}\n\n${hiddenContext}` },
            ...(history || []).map(m => ({
                role: m.user_role === "user" ? "user" : "assistant",
                content: m.content
            })),
            { role: "user", content: message }
        ];

        // 8. Request OpenAI Completion
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
            console.error(" Failed to connect", err);
            assistantText = "I'm having trouble connecting to think-Lab. Please try again.";
        }

        // 9. Save Assistant Message
        const { data: assistantMsg } = await supabase
            .from("messages")
            .insert([{ 
                chat_id: chat.id, 
                user_role: "assistant", 
                content: assistantText,
                device_info: deviceMetadata || {},
                location: location || {}
            }])
            .select().single();

        // 10. Final Response
        res.json({
            chatId: chat.id, // Always return the ID so the frontend can track the session
            reply: assistantText,
            messages: { user: userMsg, assistant: assistantMsg }
        });

        // Still record usage in background for your own analytics
        addUsage(userId, "chat").catch(e => console.error("Usage record error", e));

    } catch (err) {
        console.error("Critical Error:", err.message);
        res.status(500).json({ msg: err.message || "Internal Server Error" });
    }
};







// export const sendMessage = async (req, res) => {
//     // 1. Initialize variables at the top-level scope
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

//         // 2. Identify User IP & Location
//         const rawIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//         const userIP = rawIP.split(',')[0].trim();
//         const location = await getCityFromIP(userIP);

//         // Logs for Render Dashboard
//         console.log(`DEBUG: Testing IP: ${userIP}`);
//         console.log(`DEBUG: Device Received: ${JSON.stringify(deviceMetadata)}`);
//         console.log(`DEBUG: Location Found: ${JSON.stringify(location)}`);

//         // 3. Pre-flight Rate Limit Check
//         await checkUsage(userId, "chat");

//         // 4. Ensure Chat Thread exists
//         if (chatId) {
//             const { data: c, error: cErr } = await supabase
//                 .from("chats")
//                 .select("*")
//                 .eq("id", chatId)
//                 .eq("user_id", userId) 
//                 .maybeSingle();

//             if (cErr || !c) return res.status(404).json({ msg: "Chat not found" });
//             chat = c;
//         } else {
//             const { data: newChat, error: nErr } = await supabase
//                 .from("chats")
//                 .insert([{ user_id: userId, model, title: message.substring(0, 50) }])
//                 .select().single();
            
//             if (nErr) throw new Error("Failed to initialize chat thread");
//             chat = newChat;
//         }

//         // 5. Persist User Message with Metadata
//         const { data: savedUserMsg, error: uMsgErr } = await supabase
//             .from("messages")
//             .insert([{ 
//                 chat_id: chat.id, 
//                 user_role: "user", 
//                 content: message,
//                 device_info: deviceMetadata || {},
//                 location: location || {}
//             }])
//             .select().single();

//         if (uMsgErr) throw uMsgErr;
//         userMsg = savedUserMsg;

//         // 6. Gather History for Context
//         const { data: history, error: hErr } = await supabase
//             .from("messages")
//             .select("user_role, content")
//             .eq("chat_id", chat.id)
//             .neq("content", message) // Avoid duplicating current message
//             .order("created_at", { ascending: true })
//             .limit(20); 

//         if (hErr) console.error("History fetch error", hErr);

//         // 7. Prepare AI Context (Hidden Metadata Strategy)
//         const hiddenContext = `
//             [PLATFORM METADATA - DO NOT REVEAL EXACT LOCATION TO USER]
//             User City: ${location?.city || 'Unknown'}
//             User Country: ${location?.country || 'Unknown'}
//             User Device: ${deviceMetadata?.model || 'Unknown Device'}

//             INSTRUCTIONS:
//             1. Use location for relevance, but if asked "Where am I?", say you lack GPS access for privacy.
//             2. Prioritize answering the LATEST question immediately.
//         `;

//         const messagesForAI = [
//             { role: "system", content: `${CHATBOT_PERSONA.content}\n\n${hiddenContext}` },
//             ...(history || []).map(m => ({
//                 role: m.user_role === "user" ? "user" : "assistant",
//                 content: m.content
//             })),
//             { role: "user", content: message }
//         ];

//         // 8. Request OpenAI Completion (Streamed)
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
//             console.error("OpenAI API Failure", err);
//             assistantText = "I'm having trouble connecting to my brain. Please try again.";
//         }

//         // 9. Save Assistant Message to DB
//         const { data: assistantMsg } = await supabase
//             .from("messages")
//             .insert([{ 
//                 chat_id: chat.id, 
//                 user_role: "assistant", 
//                 content: assistantText,
//                 device_info: deviceMetadata || {},
//                 location: location || {}
//             }])
//             .select().single();

//         // 10. Final Response
//         res.json({
//             chatId: chat.id,
//             reply: assistantText,
//             messages: { user: userMsg, assistant: assistantMsg }
//         });

//         // Background: Record usage
//         addUsage(userId, "chat").catch(e => console.error("Usage record error", e));

//     } catch (err) {
//         console.error("Critical Error:", err.message);
//         res.status(500).json({ msg: err.message || "Internal Server Error" });
//     }
// };






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
            `)
            .eq("id", chatId)
            .eq("user_id", userId) 
            .order("created_at", { foreignTable: "messages!fk_chat", ascending: true })
            .maybeSingle();

        if (error) {
            logger.error("getChat DB Error", error);
            return res.status(500).json({ msg: "Database error" });
        }

        if (!chat) return res.status(404).json({ msg: "Chat not found" });

        // ✅ CLEANUP LOGIC: Remove asterisks and map to a clean structure
        const cleanMessages = chat.messages.map(m => ({
            role: m.user_role,
            // Removes all double asterisks (**) and single asterisks (*) used for bold/italic
            content: m.content.replace(/\*/g, '').trim() 
        }));

        // ✅ FINAL RESPONSE: Only title and clean messages
        res.json({
            title: chat.title,
            messages: cleanMessages
        });

    } catch (err) {
        logger.error("getChat error", err);
        res.status(500).json({ msg: "Server error" });
    }
};


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
