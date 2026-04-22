import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

export const ChatModel = {
  create: async (userId, title, model) => {
    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: userId, title, model }])
      .select()
      .single();
    
    if (error) throw error; // Controller catches this in try/catch
    return data;
  },

  getById: async (chatId, userId) => {
    return await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle();
  },

  getWithMessages: async (chatId, userId) => {
    // Note: Ensure your FK is named correctly in the schema for this join
    return await supabase
      .from("chats")
      .select(`
        title,
        messages:messages(user_role, content, created_at)
      `)
      .eq("id", chatId)
      .eq("user_id", userId)
      .order("created_at", { foreignTable: "messages", ascending: true })
      .maybeSingle();
  },

  getByUser: async (userId, limit = 20, from = 0) => {
    return await supabase
      .from("chats")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);
  },

  updateTitle: async (chatId, userId, title) => {
    return await supabase
      .from("chats")
      .update({ title })
      .eq("id", chatId)
      .eq("user_id", userId);
  },

  delete: async (chatId, userId) => {
    return await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", userId);
  }
};