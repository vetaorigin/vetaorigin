import { supabase } from "../services/supabaseClient.js";
import { initLogger } from "../utils/logger.js";

 const logger = initLogger();

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = req.headers["x-refresh-token"]; // Expect this from frontend

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // 1. Try to get the user
    let { data: { user }, error } = await supabase.auth.getUser(token);

    // 2. If token is expired but we have a refresh token, try to renew it
    if (error && refreshToken) {
      logger.info("Attempting session refresh...");
      
      const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData.user) {
        user = refreshData.user;
        // 3. Send new tokens back to frontend via Custom Headers
        res.setHeader("x-new-access-token", refreshData.session.access_token);
        res.setHeader("x-new-refresh-token", refreshData.session.refresh_token);
        logger.info("Session refreshed successfully");
      }
    }

    if (!user) {
      logger.warn("Unauthorized: Session truly expired");
      return res.status(401).json({ msg: "Session expired. Please log in again." });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error("Auth middleware critical error", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// export const requireAuth = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     // 1. Log the raw header first
//     console.log("DEBUG: Raw Auth Header ->", authHeader);

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       logger.warn("Unauthorized: No Bearer token provided");
//       return res.status(401).json({ msg: "Unauthorized" });
//     }

//     // 2. Define the token FIRST
//     const token = authHeader.split(" ")[1];

//     // 3. NOW you can log the token safely
//     console.log("DEBUG: Extracted Token ->", token);

//     const { data: { user }, error } = await supabase.auth.getUser(token);

//     if (error || !user) {
//       logger.warn("Unauthorized: Invalid or expired token", { error: error?.message });
//       return res.status(401).json({ msg: "Unauthorized" });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     logger.error("Auth middleware critical error", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };
