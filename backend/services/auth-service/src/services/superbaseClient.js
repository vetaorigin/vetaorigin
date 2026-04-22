import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Standard client for RLS-enabled operations
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Admin client for system operations (upserts, profiles, key management)
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);