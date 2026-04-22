import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

export const MessageModel = {
  save: async (chatId, role, content, metadata = {}) => {
    const { data, error } = await supabase
      .from("messages")
      .insert([{ 
        chat_id: chatId, 
        user_role: role, 
        content: content,
        device_info: metadata.device || {},
        location: metadata.location || {}
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getHistory: async (chatId, limit = 20) => {
    // Adding the .error check pattern for consistency
    const { data, error } = await supabase
      .from("messages")
      .select("id, user_role, content") // Added ID for deduplication
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false }) // Get newest first
      .limit(limit);
      
    // Return sorted ascending so the AI receives it in chronological order
    const sortedData = data ? data.reverse() : [];
    return { data: sortedData, error };
  }
};