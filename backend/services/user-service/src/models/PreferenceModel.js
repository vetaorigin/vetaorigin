import { supabase } from "../services/supabaseClient.js";

export const PreferenceModel = {
    /**
     * Fetch all preferences for a user
     */
    findByUserId: async (userId) => {
        const { data, error } = await supabase
            .from("user_preferences")
            .select("setting_key, setting_value")
            .eq("user_id", userId);

        if (error) throw error;
        
        // Transform array of objects into a clean key-value object: { "theme": "dark" }
        return data.reduce((acc, curr) => {
            acc[curr.setting_key] = curr.setting_value;
            return acc;
        }, {});
    },

    /**
     * Upsert a specific setting
     */
    upsert: async (userId, key, value) => {
        const { data, error } = await supabase
            .from("user_preferences")
            .upsert(
                { 
                    user_id: userId, 
                    setting_key: key, 
                    setting_value: value 
                },
                { onConflict: "user_id, setting_key" }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};