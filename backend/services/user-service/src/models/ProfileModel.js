import { supabase } from "../services/supabaseClient.js";

export const ProfileModel = {
    /**
     * Find profile by user_id
     */
    findById: async (userId) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Update profile and merge custom metadata
     * Using JSONB merge in Supabase/PostgreSQL is key here
     */
    update: async (userId, updates) => {
        // We use an upsert to ensure we always have a row
        // The 'metadata' field should be a JSONB column in your database
        const { data, error } = await supabase
            .from("profiles")
            .upsert({
                user_id: userId,
                display_name: updates.display_name,
                bio: updates.bio,
                avatar_url: updates.avatar_url,
                metadata: updates.metadata // This is the extensible JSONB field
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};