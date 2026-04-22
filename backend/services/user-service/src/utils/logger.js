// src/utils/logger.js
export const initLogger = () => {
    return {
        info: (msg, meta = {}) => console.log(new Date().toISOString(), "INFO:", msg, JSON.stringify(meta)),
        error: (msg, meta = {}) => console.error(new Date().toISOString(), "ERROR:", msg, JSON.stringify(meta)),
        warn: (msg, meta = {}) => console.warn(new Date().toISOString(), "WARN:", msg, JSON.stringify(meta))
    };
};