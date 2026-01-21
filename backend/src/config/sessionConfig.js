// config/sessionConfig.js
// import session from "express-session";
import pgSession from "connect-pg-simple";
import pkg from "pg";
import dotenv from "dotenv";
import { initLogger } from "../utils/logger.js";

dotenv.config();
const logger = initLogger();

const { Pool } = pkg;

// Check environment variables
// if (!process.env.SESSION_SECRET) {
//   logger.error("Missing SESSION_SECRET in environment variables!");
//   throw new Error("SESSION_SECRET is required for sessions");
// }

// PostgreSQL connection pool
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  logger.info("PostgreSQL session store initialized");
} else {
  logger.warn("No DATABASE_URL found. Using in-memory session store (not recommended for production)");
}

// Configure connect-pg-simple store
const PgStore = pgSession(session);

export const sessionMiddleware = session({
  store: pool ? new PgStore({ pool }) : undefined, // fallback to default memory store
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only over HTTPS in production
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

logger.info("Session middleware configured");
