import { initTracing } from './utils/tracing.js';
import { initLogger } from './utils/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js'; // Import this
import express from 'express';
import { setupProxies } from './middleware/proxy.js';
import helmet from 'helmet';

// 1. Init Infrastructure
initTracing();
const logger = initLogger();
const app = express();

// 2. Global Security & Parsing
app.use(helmet()); 
app.use(rateLimiter);
// app.use(express.json());

// 3. Routing
setupProxies(app);

// 4. Error Handling (MUST be after setupProxies)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
});

// 5. Graceful Shutdown for AWS
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });
});