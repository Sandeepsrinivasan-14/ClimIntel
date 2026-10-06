import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/** Gemini model used for insights and search. Override with GEMINI_MODEL in .env.local. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

/** The Google AI plugin reads GEMINI_API_KEY or GOOGLE_API_KEY. */
export const isAiConfigured = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

export const ai = genkit({
  plugins: [googleAI()],
  model: `googleai/${GEMINI_MODEL}`,
});
