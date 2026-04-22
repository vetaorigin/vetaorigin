import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

/**
 * VoiceModel
 * Tracks all TTS, STT, and S2S operations.
 */
export const VoiceModel = {
  /**
   * Records a voice-related event with metadata support.
   */
  recordAction: async (userId, type, filePath, transcription = "", metadata = {}) => {
    const { data, error } = await supabase
      .from("voice_actions")
      .insert([{ 
        user_id: userId, 
        action_type: type, // 'tts', 'stt', or 's2s'
        file_path: filePath, 
        transcription: transcription,
        device_info: metadata.device || {},
        location: metadata.location || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error("VoiceModel Error:", error);
      throw error;
    }
    return data;
  },

  /**
   * Retrieves the last N voice actions for a user.
   * Useful for showing a history list in the mobile app.
   */
  getHistory: async (userId, limit = 10) => {
    const { data, error } = await supabase
      .from("voice_actions")
      .select("action_type, transcription, created_at, file_path")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};