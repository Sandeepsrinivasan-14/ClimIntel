import { z } from 'zod';

export type ClimateBaseline = {
  /** °C */
  temp: number;
  /** % relative humidity */
  humidity: number;
  /** mm per day */
  precip: number;
  /** km/h */
  wind: number;
};

export type Region = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Relative volume of simulated cases (larger metros are higher). */
  scale: number;
  climate: ClimateBaseline;
};

export type DiseaseTransmission = 'vector' | 'water';

export type Disease = {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  prevention: string[];
  transmission: DiseaseTransmission;
  /** Average daily cases at a scale-1 city in peak conditions. */
  baseCases: number;
  /** Case fatality ratio used for the simulated deaths. */
  fatality: number;
};

export type DailyWeather = {
  /** yyyy-MM-dd */
  date: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  description: string;
};

export type DailyRecord = DailyWeather & {
  /** Short label for chart axes, e.g. "Oct 5". */
  label: string;
  cases: number;
  deaths: number;
  /** True for days after the selected window (model projection). */
  isForecast: boolean;
};

export type KpiData = {
  totalCases: number;
  periodChange: number;
  mortalityRate: number;
};

export type CorrelationFactor = {
  factor: 'Temperature' | 'Humidity' | 'Rainfall (10-day lag)';
  /** Pearson correlation coefficient between the factor and daily cases. */
  r: number;
  strength: 'Very strong' | 'Strong' | 'Moderate' | 'Weak' | 'Negligible';
};

/** One row of chart data: a label plus numeric series that may be empty (null). */
export type ChartRow = Record<string, string | number | null>;

export type FilterSet = {
  regionId: string;
  diseaseId: string;
  date: Date | null;
};

export type ArchivedSummary = {
  id: string;
  summary: string;
  recommendations: string[];
  regionName: string;
  date: string;
  archivedAt: string;
};

export type AiSummary = {
  summary: string;
  recommendations: string[];
};

const regionSchema = z.object({ id: z.string(), name: z.string() });
const diseaseSchema = z.object({ id: z.string(), name: z.string() });

export const ParseSearchQueryInputSchema = z.object({
  query: z.string().describe('The natural language search query from the user.'),
  regions: z.array(regionSchema).describe('The list of available regions.'),
  diseases: z.array(diseaseSchema).describe('The list of available diseases.'),
  currentDate: z.string().describe('The current date in ISO format (YYYY-MM-DD), to resolve relative dates like "yesterday" or "last month".'),
});
export type ParseSearchQueryInput = z.infer<typeof ParseSearchQueryInputSchema>;

export const ParseSearchQueryOutputSchema = z.object({
  regionId: z.string().optional().describe('The ID of the identified region.'),
  diseaseId: z.string().optional().describe('The ID of the identified disease.'),
  date: z.string().optional().describe('The identified date in ISO format (YYYY-MM-DD).'),
});
export type ParseSearchQueryOutput = z.infer<typeof ParseSearchQueryOutputSchema>;
