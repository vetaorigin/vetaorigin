// models/userModel.js
import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

export const getUserById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,username,email")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logger.error("Failed to fetch user by ID", { id, error });
      throw error;
    }

    return data;
  } catch (err) {
    logger.error("getUserById error", err);
    throw err;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      logger.error("Failed to fetch user by email", { email, error });
      throw error;
    }

    return data;
  } catch (err) {
    logger.error("getUserByEmail error", err);
    throw err;
  }
};

export const createUser = async ({ username, email, password }) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password }])
      .select()
      .single();

    if (error) {
      logger.error("Failed to create user", { username, email, error });
      throw error;
    }

    return data;
  } catch (err) {
    logger.error("createUser error", err);
    throw err;
  }
};
