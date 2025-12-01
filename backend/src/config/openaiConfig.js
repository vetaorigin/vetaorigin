// config/openaiConfig.js
import OpenAI from "openai";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

if (!process.env.OPENAI_API_KEY) {
  logger.error("Missing OPENAI_API_KEY in environment variables!");
  throw new Error("OPENAI_API_KEY is required in production");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
