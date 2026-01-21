//middleware/authMiddleware.js
// import { initLogger } from "../utils/logger.js";

// const logger = initLogger();

// /**
//  * Ensures the user is logged in
//  */
// export const requireAuth = (req, res, next) => {
//   try {
//     if (!req.session || !req.session.userId) {
//       logger.warn("Unauthorized access attempt");
//       return res.status(401).json({ msg: "Unauthorized" });
//     }
//     next();
//   } catch (err) {
//     logger.error("Auth middleware error", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };



import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Ensures the user is logged in via Supabase JWT (Mobile compatible)
 */
export const requireAuth = async (req, res, next) => {
  try {
    // 1. Extract the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized: No Bearer token provided");
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify the token with Supabase
    // This is more secure than just decoding it, as it checks if the user still exists/is active
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn("Unauthorized: Invalid or expired token", { error: error?.message });
      return res.status(401).json({ msg: "Unauthorized" });
    }

    // 3. Attach the user object to the request
    // Your controllers can now access req.user.id
    req.user = user;
    
    next();
  } catch (err) {
    logger.error("Auth middleware critical error", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


