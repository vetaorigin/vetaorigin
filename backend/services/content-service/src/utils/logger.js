import { createLogger, format, transports } from "winston";

export const initLogger = () =>
  createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }), // Automatically include stack traces
      format.json() // JSON format is much easier for log aggregators (e.g., Datadog, ELK, or Render logs) to parse
    ),
    defaultMeta: { service: "content-service" },
    transports: [
      // In cloud environments, we only need to output to console.
      // The platform (Render) automatically collects and stores these logs.
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf(({ level, message, timestamp, stack, ...meta }) => {
            return `${timestamp} ${level}: ${stack || message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ""
            }`;
          })
        )
      })
    ],
    exitOnError: false,
  });