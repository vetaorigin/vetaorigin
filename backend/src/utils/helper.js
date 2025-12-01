// utils/helper.js
import { initLogger } from "./logger.js";
const logger = initLogger();

/**
 * Returns current Unix timestamp (seconds)
 */
export function now() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Checks if a timestamp has expired
 * @param {number} timestamp
 * @returns {boolean}
 */
export function hasExpired(timestamp) {
  return timestamp < now();
}

/**
 * Converts seconds to human-readable HH:MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

/**
 * Logs and throws an error for consistent handling
 * @param {string} message
 * @param {Error} error
 */
export function handleError(message, error) {
  logger.error(message, error);
  throw new Error(message);
}
