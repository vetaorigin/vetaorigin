// // src/services/supabaseClient.js
// import { createClient } from "@supabase/supabase-js";
// import { initLogger } from "../utils/logger.js";
// import dotenv from "dotenv";
// dotenv.config();
// const logger = initLogger();

// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_KEY;

// if (!SUPABASE_URL || !SUPABASE_KEY) {
//   logger.error("Supabase URL or KEY missing in environment variables!");
//   throw new Error("Supabase credentials are required.");
// }

// export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// logger.info("Supabase client initialized successfully");



// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { initLogger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();
const logger = initLogger();

const SUPABASE_URL = process.env.SUPABASE_URL;
// ✅ Rename this variable to be clear it is the SECRET key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error("Supabase URL or SERVICE_ROLE_KEY missing!");
  throw new Error("Supabase credentials are required.");
}

// ✅ Add configuration options for Server-Side usage
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,   // 🚨 CRITICAL: Prevents server from trying to use local storage/cookies
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

logger.info("Supabase Admin Client initialized (Stateless)");
