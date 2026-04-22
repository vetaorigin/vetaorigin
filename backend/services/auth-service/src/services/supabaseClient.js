import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create the clients if the keys are actually present
export const supabase = createClient(url, anonKey);

// Check if service key exists before creating admin client
export const supabaseAdmin = serviceKey 
  ? createClient(url, serviceKey) 
  : null; 

if (!supabaseAdmin) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
}