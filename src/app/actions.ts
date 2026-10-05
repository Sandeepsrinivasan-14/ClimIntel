'use server';

import { z } from 'zod';
import { generateClimateHealthSummary } from '@/ai/flows/generate-climate-health-summary';
import { parseSearchQuery } from '@/ai/flows/parse-search-query';
import { isAiConfigured } from '@/ai/genkit';
import { describeWindowForAi, findRegion } from '@/lib/data';
import { getRealtimeWeather, type WeatherData } from '@/lib/weather';
import { keywordSearch } from '@/lib/keyword-search';
import type { AiSummary, ParseSearchQueryOutput } from '@/lib/types';
import { ParseSearchQueryInputSchema } from '@/lib/types';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: unknown, fallback: string): { ok: false; error: string } => {
  console.error(error);
  return { ok: false, error: error instanceof z.ZodError ? 'Invalid input.' : fallback };
};

const summarySchema = z.object({ regionId: z.string(), diseaseId: z.string(), date: z.string() });

export async function getAiSummary(input: z.infer<typeof summarySchema>): Promise<Result<AiSummary>> {
  if (!isAiConfigured()) {
    return { ok: false, error: 'AI insights need a Gemini API key. Add GEMINI_API_KEY to .env.local and restart the server.' };
  }
  try {
    const { regionId, diseaseId, date } = summarySchema.parse(input);
    const region = findRegion(regionId);
    if (!region) return { ok: false, error: 'Unknown region.' };

    const center = new Date(date);
    const window = describeWindowForAi(regionId, diseaseId, center);
    const now = await getRealtimeWeather(region);
    const current = `Current conditions (${now.source === 'live' ? 'live' : 'simulated'}): ${now.condition.text}, ${now.temp_c}°C, humidity ${now.humidity}%, wind ${now.wind_kph} km/h, rain ${now.precip_mm} mm.`;

    const result = await generateClimateHealthSummary({
      region: region.name,
      timePeriod: center.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      weatherData: `${window.weather} ${current}`,
      diseaseCaseData: window.disease,
    });
    return { ok: true, data: result };
  } catch (error) {
    return fail(error, 'Failed to generate the insight. Check your Gemini key and model, then try again.');
  }
}

export async function getWeatherAction(input: { regionId: string }): Promise<Result<WeatherData>> {
  try {
    const { regionId } = z.object({ regionId: z.string() }).parse(input);
    const region = findRegion(regionId);
    if (!region) return { ok: false, error: 'Unknown region.' };
    return { ok: true, data: await getRealtimeWeather(region) };
  } catch (error) {
    return fail(error, 'Failed to fetch weather data.');
  }
}

/** Search bar: uses Gemini when a key is set, otherwise a keyword parser. */
export async function parseSearchQueryAction(
  input: z.infer<typeof ParseSearchQueryInputSchema>,
): Promise<Result<ParseSearchQueryOutput> & { mode?: 'ai' | 'keyword' }> {
  try {
    const validated = ParseSearchQueryInputSchema.parse(input);
    if (!isAiConfigured()) {
      const data = keywordSearch(validated.query, validated.regions, validated.diseases, new Date(validated.currentDate));
      return { ok: true, data, mode: 'keyword' };
    }
    return { ok: true, data: await parseSearchQuery(validated), mode: 'ai' };
  } catch (error) {
    return fail(error, 'Failed to understand that search.');
  }
}
