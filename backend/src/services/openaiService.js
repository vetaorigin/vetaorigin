// services/openaiService.js
import { openai } from "../config/openaiConfig.js";
import { initLogger } from "../utils/logger.js";

const logger = initLogger();

/**
 * Generate Text-to-Speech audio from text
 * @param {string} text
 * @param {string} voice
 * @returns {Buffer} audio buffer
 */
export const generateTTS = async (text, voice = "alloy") => {
  try {
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    logger.info("Generated TTS", { textLength: text.length });
    return audioBuffer;
  } catch (err) {
    logger.error("TTS generation failed", err);
    throw err;
  }
};

/**
 * Convert speech audio to text
 * @param {Buffer} audioBuffer
 * @returns {string} transcript
 */
export const transcribeAudio = async (audioBuffer) => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: "whisper-1",
    });

    logger.info("Audio transcribed successfully");
    return response.text;
  } catch (err) {
    logger.error("STT transcription failed", err);
    throw err;
  }
};

/**
 * Translate text to target language
 * @param {string} text
 * @param {string} targetLanguage
 * @returns {string} translated text
 */
export const translateText = async (text, targetLanguage) => {
  try {
    const prompt = `Translate the following text to ${targetLanguage}: ${text}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const translated = response.choices[0].message.content;
    logger.info("Text translated", { targetLanguage });
    return translated;
  } catch (err) {
    logger.error("Translation failed", err);
    throw err;
  }
};
