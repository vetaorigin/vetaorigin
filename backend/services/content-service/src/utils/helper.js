import { initLogger } from "./logger.js";
const logger = initLogger();

/**
 * Returns current Unix timestamp (seconds)
 */
export const now = () => Math.floor(Date.now() / 1000);

/**
 * Checks if a timestamp has expired
 */
export const hasExpired = (timestamp) => timestamp < now();

/**
 * Converts seconds to human-readable format
 */
export const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`.replace(/^0h /, "").replace(/^0m /, "");
};

/**
 * Enhanced Error Handler
 * Added support for status codes and detailed context
 */
export const handleError = (message, error, statusCode = 500) => {
  logger.error(message, { 
    error: error?.message || error,
    stack: error?.stack 
  });
  
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};