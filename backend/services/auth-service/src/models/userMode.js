import { supabaseAdmin as supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const UserModel = {
  // 1. Fetch user by ID
  findById: async (id) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", id)
      .maybeSingle();
    
    if (error) {
      logger.error("Database error in findById", { id, error });
      throw error;
    }
    return data;
  },

  // 2. Fetch user by Email
  findByEmail: async (email) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      logger.error("Database error in findByEmail", { email, error });
      throw error;
    }
    return data;
  },

  // 3. Create or Update user (Supports OAuth & Standard Sign-up)
  upsertUser: async ({ id, username, email, password }) => {
    try {
      const userData = { id, username, email };
      if (password) userData.password = password;

      const { data, error } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' })
        .select("id, username, email")
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error("Failed to upsert user", { id, email, error: err });
      throw err;
    }
  }
};