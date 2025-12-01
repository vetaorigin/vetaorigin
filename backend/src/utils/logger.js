// utils/logger.js
import { createLogger, format, transports } from "winston";
import path from "path";

const logs = path.join(process.cwd(), "logs"); // existing logs folder

export const initLogger = () =>
  createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: format.combine(
      format.timestamp(),
      format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} [${level}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ""
        }`;
      })
    ),
    transports: [
      new transports.Console(), // console output
      new transports.File({ filename: path.join(logs, "combined.log") }), // all logs
      new transports.File({ filename: path.join(logs, "error.log"), level: "error" }), // errors only
    ],
    exitOnError: false,
  });
