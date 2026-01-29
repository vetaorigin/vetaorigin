// import { createClient } from "@supabase/supabase-js";
// import { initLogger } from "../utils/logger.js";
// import dotenv from "dotenv";

// dotenv.config();
// const logger = initLogger();

// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// // Ensure all required keys are present for the backend to function
// if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
//   logger.error("Critical Supabase credentials missing! Check URL, ANON_KEY, and SERVICE_ROLE_KEY.");
//   throw new Error("Missing Supabase environment variables.");
// }

// /**
//  * 1. MAIN CLIENT (Standard User Access)
//  * Used for Auth operations (login/signup) and standard user-context queries.
//  * Respects Row Level Security (RLS).
//  */
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: {
//     persistSession: false,
//     autoRefreshToken: false,
//     detectSessionInUrl: false
//   }
// });

// /**
//  * 2. ADMIN CLIENT (Bypasses RLS)
//  * Use this in your Controllers (like chatController.js) to perform 
//  * operations that RLS would otherwise block.
//  */
// export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
//   auth: {
//     persistSession: false,
//     autoRefreshToken: false,
//     detectSessionInUrl: false
//   }
// });

// logger.info("Supabase Clients initialized: Standard (RLS) & Admin (Bypass)");


import { createClient } from "@supabase/supabase-js";
import { initLogger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();
const logger = initLogger();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // <--- ADD THIS
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.error("Supabase URL or ANON_KEY missing!");
  throw new Error("Supabase credentials are required.");
}

// 1. MAIN CLIENT (Used for Authentication and User requests)
// Using the ANON_KEY here fixes the "Invalid Signature" error
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// 2. ADMIN CLIENT (Only for tasks that require bypassing RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  }
});

logger.info("Supabase Clients initialized (User & Admin)");

