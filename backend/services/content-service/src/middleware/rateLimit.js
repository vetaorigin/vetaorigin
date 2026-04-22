import { checkUsage } from "../utils/rateLimiter.js";

export const rateLimit = (type) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            // Uses your existing utility logic
            await checkUsage(userId, type);
            next();
        } catch (err) {
            res.status(429).json({ msg: "Rate limit exceeded" });
        }
    };
};