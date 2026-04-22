// import rateLimit from 'express-rate-limit';
// import fs from 'fs';

// const config = JSON.parse(fs.readFileSync('./config/rate-limits.json', 'utf-8'));

// export const rateLimiter = (req, res, next) => {
//     const path = req.path.split('/')[1]; // Get top-level route (e.g., 'auth')
//     const serviceLimit = config.services[`/${path}`]?.max || config.max;

//     const limiter = rateLimit({
//         windowMs: config.windowMs,
//         max: serviceLimit,
//         message: { error: "Too many requests, please try again later." },
//         standardHeaders: true,
//         legacyHeaders: false,
//     });

//     return limiter(req, res, next);
// };

import rateLimit from 'express-rate-limit';
import fs from 'fs';

// 1. Load config once
const config = JSON.parse(fs.readFileSync('./config/rate-limits.json', 'utf-8'));

// 2. Pre-create a map to store our limiters
const limiters = {};

// Helper function to generate the rate limiter instance
const createLimiter = (maxRequests) => {
    return rateLimit({
        windowMs: config.windowMs,
        max: maxRequests,
        message: { error: "Too many requests, please try again later." },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// 3. Initialize all limiters upfront
// Create default global limiter
limiters['default'] = createLimiter(config.max);

// Create specific limiters for each service defined in config
Object.keys(config.services).forEach((path) => {
    limiters[path] = createLimiter(config.services[path].max);
});

// 4. The middleware now simply calls the pre-allocated instance
export const rateLimiter = (req, res, next) => {
    const pathKey = `/${req.path.split('/')[1]}`; // e.g., "/auth"
    const limiter = limiters[pathKey] || limiters['default'];
    
    return limiter(req, res, next);
};