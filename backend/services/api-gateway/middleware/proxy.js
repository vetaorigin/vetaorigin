// import { createProxyMiddleware } from 'http-proxy-middleware';
// import fs from 'fs';
// import path from 'path';
// import { initLogger } from '../utils/logger.js'; // Import your logger

// const logger = initLogger();

// // Load routes from config
// const routesConfig = JSON.parse(
//     fs.readFileSync(path.resolve('./config/routes.json'), 'utf-8')
// );

// /**
//  * Helper to resolve target URL.
//  * Prioritizes Environment Variables for AWS (e.g., AUTH_SERVICE_URL)
//  * Fallbacks to routes.json (for local dev)
//  */
// const getTarget = (service) => {
//     // Converts "auth-service" to "AUTH_SERVICE_URL"
//     const envVarName = `${service.name.toUpperCase().replace(/-/g, '_')}_URL`;
//     return process.env[envVarName] || service.target;
// };

// export const setupProxies = (app) => {
//     routesConfig.services.forEach((service) => {
//         const targetUrl = getTarget(service);

//         app.use(
//             service.prefix,
//             createProxyMiddleware({
//                 target: targetUrl,
//                 changeOrigin: true,
//                 proxyTimeout: 5000, // 5 seconds timeout
//                 timeout: 5000,      // Total timeout
//                 // pathRewrite: {
//                 //     [`^${service.prefix}`]: '', 
//                 // },
//                 onProxyReq: (proxyReq, req, res) => {
//                     // Useful for AWS: pass the original user ID if authenticated
//                     // if (req.user) {
//                     //     proxyReq.setHeader('x-user-id', req.user.id);
//                     // }
//                 },
//                 onError: (err, req, res) => {
//                     logger.error(`Proxy error for ${service.name} at ${targetUrl}:`, err);
//                     res.status(502).json({ 
//                         success: false,
//                         error: `Service ${service.name} is currently unavailable` 
//                     });
//                 }
//             })
//         );
//         logger.info(`Proxy initialized: ${service.prefix} -> ${targetUrl}`);
//     });
// };

import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import path from 'path';
import { initLogger } from '../utils/logger.js';

const logger = initLogger();

const routesConfig = JSON.parse(
    fs.readFileSync(path.resolve('./config/routes.json'), 'utf-8')
);

const getTarget = (service) => {
    const envVarName = `${service.name.toUpperCase().replace(/-/g, '_')}_URL`;
    return process.env[envVarName] || service.target;
};

export const setupProxies = (app) => {
    routesConfig.services.forEach((service) => {
        const targetUrl = getTarget(service);

        app.use(
            service.prefix,
            createProxyMiddleware({
                target: targetUrl,
                changeOrigin: true,
                // INCREASED TIMEOUTS: 120 seconds is standard for LLM streaming
                proxyTimeout: 120000, 
                timeout: 120000,      
                
                // CRITICAL FOR STREAMING: 
                // Ensure the connection stays alive while the AI is generating text
                headers: {
                    'Connection': 'keep-alive'
                },

                // Log the start of the request
                onProxyReq: (proxyReq, req, res) => {
                    logger.info(`Proxying request: ${req.method} ${req.url} -> ${targetUrl}`);
                },

                onError: (err, req, res) => {
                    logger.error(`Proxy error for ${service.name} at ${targetUrl}:`, err);
                    // Use 504 Gateway Timeout if it's a timeout error
                    const status = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' ? 504 : 502;
                    res.status(status).json({ 
                        success: false,
                        error: `Service ${service.name} is currently unavailable or timed out` 
                    });
                }
            })
        );
        logger.info(`Proxy initialized: ${service.prefix} -> ${targetUrl} (Timeout: 120s)`);
    });
};

















