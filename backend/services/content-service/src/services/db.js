// src/services/db.js
import { supabase, supabaseAdmin } from "./supabaseClient.js";

// Export a single 'db' object that prioritizes Admin access but falls back to Public
export const db = supabaseAdmin || supabase;

if (!supabaseAdmin) {
    console.warn("WARNING: Using Public Supabase client for all operations. Admin bypass is disabled.");
}