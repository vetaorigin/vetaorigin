import { supabase as supabaseAnon, supabaseAdmin } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();
// Always prefer admin access for backend server operations
const db = supabaseAdmin || supabaseAnon;

export const UserModel = {
    // 1. Fetch user by ID
    findById: async (id) => {
        const { data, error } = await db // Changed from 'supabase' to 'db'
            .from("users")
            .select("id, username, email, display_name, bio, avatar_url, metadata")
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
        const { data, error } = await db // Changed from 'supabase' to 'db'
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

    // 3. Create or Update user
    upsertUser: async ({ id, username, email }) => {
        try {
            const { data, error } = await db
                .from("users")
                .upsert({ id, username, email }, { onConflict: 'id' })
                .select("id, username, email")
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            logger.error("Failed to upsert user", { id, email, error: err });
            throw err;
        }
    },

    // 4. Authenticate
    authenticate: async (email, password) => {
        // Auth is a specialized SDK call, keep using 'supabaseAnon' here
        const { data, error } = await supabaseAnon.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        
        // Fetch profile using the privileged 'db'
        const profile = await UserModel.findById(data.user.id);
        return { session: data.session, userProfile: profile };
    }
};



// // import { supabaseAdmin as supabase } from "../services/supabaseClient.js";
// // import { initLogger } from "../utils/logger.js";
// import { supabase as supabaseAnon, supabaseAdmin } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
// import { supabase } from "../services/supabaseClient.js";
// const logger = initLogger();
// const db = supabaseAdmin || supabaseAnon;
// export const UserModel = {
//   // 1. Fetch user by ID
//   findById: async (id) => {
//     const { data, error } = await supabase
//       .from("users")
//       .select("id, username, email")
//       .eq("id", id)
//       .maybeSingle();
    
//     if (error) {
//       logger.error("Database error in findById", { id, error });
//       throw error;
//     }
//     return data;
//   },

//   // 2. Fetch user by Email
//   findByEmail: async (email) => {
//     const { data, error } = await supabase
//       .from("users")
//       .select("*")
//       .eq("email", email)
//       .maybeSingle();

//     if (error) {
//       logger.error("Database error in findByEmail", { email, error });
//       throw error;
//     }
//     return data;
//   },

//   // 3. Create or Update user (Supports OAuth & Standard Sign-up)
//   upsertUser: async ({ id, username, email, password }) => {
//         try {
//             const userData = { id, username, email };
//             if (password) userData.password = password;

//             // Use the 'db' variable instead of 'supabase'
//             const { data, error } = await db
//                 .from("users")
//                 .upsert(userData, { onConflict: 'id' })
//                 .select("id, username, email")
//                 .single();

//             if (error) throw error;
//             return data;
//         } catch (err) {
//             logger.error("Failed to upsert user", { id, email, error: err });
//             throw err;
//         }
//     },
//     authenticate: async (email, password) => {
//     const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//     });
//     if (error) throw error;
    
//     // Fetch profile after successful auth
//     const profile = await UserModel.findById(data.user.id);
//     return { session: data.session, userProfile: profile };
// }
// };