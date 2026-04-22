import 'dotenv/config'; // Keep this at the absolute top
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 1. Validate critical configuration
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("MISSING_SUPABASE_CONFIG: SUPABASE_URL and SUPABASE_ANON_KEY are required.");
}

// 2. Initialize clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;

if (!supabaseAdmin) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
}