import pino from 'pino';

export const initLogger = () => {
    return pino({
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
            level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    });
};