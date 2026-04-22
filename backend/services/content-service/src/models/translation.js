import { supabaseAdmin as supabase } from "../services/supabaseClient.js";

export const TranslationModel = {
  log: async (userId, sourceText, targetText, targetLang, metadata = {}) => {
    const { data, error } = await supabase
      .from("translations")
      .insert([{ 
        user_id: userId, 
        source_content: sourceText, 
        translated_content: targetText,
        target_lang: targetLang,
        device_info: metadata.device || {},
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    return data;
  }
};