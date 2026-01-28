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



// import { supabase } from "../services/supabaseClient.js";
// import { initLogger } from "../utils/logger.js";
import jwt from "jsonwebtoken";





export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ msg: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 👈 THIS is what chatController uses
        next();
    } catch {
        return res.status(401).json({ msg: "Invalid token" });
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






