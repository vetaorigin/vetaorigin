// src/utils/helper.js
import { initLogger } from "./logger.js";

const logger = initLogger();

/**
 * Standardized error handler to keep controllers clean
 */
export const handleError = (context, err, statusCode = 500) => {
    logger.error(context, { message: err.message });
    
    // You can customize the response format here
    return {
        status: statusCode,
        payload: {
            success: false,
            msg: err.message || "An internal error occurred",
            context: context
        }
    };
};