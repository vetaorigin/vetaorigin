// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { initLogger } from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();
const logger = initLogger();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.error("Supabase URL or KEY missing in environment variables!");
  throw new Error("Supabase credentials are required.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

logger.info("Supabase client initialized successfully");
