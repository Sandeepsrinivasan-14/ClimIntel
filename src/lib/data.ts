import { format, parseISO } from 'date-fns';
import { regions } from './regions';
import { forecastDays, hashString, mulberry32, recentRain, weatherOn, windowDays, WINDOW_BEFORE } from './climate';
import type { CorrelationFactor, DailyRecord, Disease, KpiData, Region } from './types';

export { regions };

export const diseases: Disease[] = [
  {
    id: 'dengue',
    name: 'Dengue',
    description: 'A mosquito-borne viral infection causing a severe flu-like illness and, sometimes, a potentially lethal complication called severe dengue.',
    symptoms: ['High Fever', 'Severe Headache', 'Pain behind eyes', 'Joint & Muscle pain', 'Rash'],
    prevention: ['Use mosquito repellent', 'Wear long-sleeved clothes', 'Eliminate mosquito breeding sites (e.g., standing water)'],
    transmission: 'vector',
    baseCases: 150,
    fatality: 0.008,
  },
  {
    id: 'malaria',
    name: 'Malaria',
    description: 'A life-threatening disease caused by parasites that are transmitted to people through the bites of infected female Anopheles mosquitoes.',
    symptoms: ['Fever and Chills', 'Headache', 'Nausea and Vomiting', 'Muscle pain and fatigue'],
    prevention: ['Use insecticide-treated mosquito nets', 'Indoor residual spraying', 'Preventive antimalarial drugs for travelers'],
    transmission: 'vector',
    baseCases: 120,
    fatality: 0.004,
  },
  {
    id: 'cholera',
    name: 'Cholera',
    description: 'An acute diarrhoeal infection caused by ingestion of food or water contaminated with the bacterium Vibrio cholerae.',
    symptoms: ['Profuse watery diarrhea', 'Vomiting', 'Leg cramps', 'Rapid dehydration', 'Shock'],
    prevention: ['Drink and use safe, treated water', 'Wash hands with soap and water', 'Cook food well and eat it hot'],
    transmission: 'water',
    baseCases: 70,
    fatality: 0.01,
  },
  {
    id: 'typhoid',
    name: 'Typhoid',
    description: 'A bacterial infection that can lead to a high fever, diarrhea, and vomiting. It is caused by the bacteria Salmonella typhi.',
    symptoms: ['Sustained high fever', 'Weakness', 'Stomach pain', 'Headache', 'Loss of appetite or rash'],
    prevention: ['Get vaccinated against typhoid fever', 'Avoid risky food and drinks', 'Choose hot foods and peel fruits/vegetables'],
    transmission: 'water',
    baseCases: 90,
    fatality: 0.01,
  },
];

export const findRegion = (id: string) => regions.find((r) => r.id === id);
export const findDisease = (id: string) => diseases.find((d) => d.id === id);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Simulated cases for one city, disease and day.
 *
 * Mosquito-borne diseases peak around 28 °C and rise with humidity and with rain
 * over the previous 10 days (standing water for breeding). Water-borne diseases
 * rise with warmth and recent rain (contaminated water). This is a teaching
 * model, not an epidemiological one.
 */
function casesOn(region: Region, disease: Disease, date: Date) {
  const w = weatherOn(region, date);
  const rain = recentRain(region, date);
  const rand = mulberry32(hashString(`${region.id}|${disease.id}|${format(date, 'yyyy-MM-dd')}`));

  let factor: number;
  if (disease.transmission === 'vector') {
    const temp = Math.exp(-((w.temperature - 28) ** 2) / (2 * 5 ** 2));
    const wet = 0.4 + Math.min(rain / 50, 1.6);
    const humid = 0.6 + w.humidity / 200;
    factor = temp * wet * humid;
  } else {
    const warm = 0.5 + clamp((w.temperature - 15) / 20, 0, 1) * 0.7;
    const wet = 0.5 + Math.min(rain / 35, 2);
    factor = warm * wet;
  }

  const expected = disease.baseCases * region.scale * factor;
  const cases = Math.max(0, Math.round(expected * (0.85 + rand() * 0.3)));
  const deaths = Math.floor(cases * disease.fatality + rand());
  return { weather: w, cases, deaths };
}

/** Daily records for the 29-day window around `center`, plus the 7-day projection after it. */
export function getRecords(regionId: string, diseaseId: string, center: Date): DailyRecord[] {
  const region = findRegion(regionId);
  const disease = findDisease(diseaseId);
  if (!region || !disease) return [];

  const build = (date: Date, isForecast: boolean): DailyRecord => {
    const { weather, cases, deaths } = casesOn(region, disease, date);
    return { ...weather, label: format(date, 'MMM d'), cases, deaths, isForecast };
  };

  return [...windowDays(center).map((d) => build(d, false)), ...forecastDays(center).map((d) => build(d, true))];
}

const observed = (records: DailyRecord[]) => records.filter((r) => !r.isForecast);

export const getChartData = (regionId: string, diseaseId: string, center: Date) =>
  getRecords(regionId, diseaseId, center).map((r) => ({
    date: r.label,
    cases: r.isForecast ? null : r.cases,
    deaths: r.isForecast ? null : r.deaths,
    forecastCases: r.isForecast ? r.cases : null,
  }));

export const getTemperatureChartData = (regionId: string, center: Date) => {
  const region = findRegion(regionId);
  if (!region) return [];
  const days = [...windowDays(center).map((d) => ({ d, f: false })), ...forecastDays(center).map((d) => ({ d, f: true }))];
  return days.map(({ d, f }) => {
    const w = weatherOn(region, d);
    return { date: format(d, 'MMM d'), temperature: f ? null : w.temperature, forecastTemp: f ? w.temperature : null };
  });
};

export type WeatherMetric = 'humidity' | 'precipitation' | 'windSpeed';

/** Rows for the humidity / rainfall / wind charts, split into observed and projected values. */
export const getWeatherTrendData = (regionId: string, center: Date) => {
  const region = findRegion(regionId);
  if (!region) return [];
  const days = [...windowDays(center).map((d) => ({ d, f: false })), ...forecastDays(center).map((d) => ({ d, f: true }))];
  return days.map(({ d, f }) => {
    const w = weatherOn(region, d);
    return {
      date: format(d, 'MMM d'),
      humidity: f ? null : w.humidity,
      precipitation: f ? null : w.precipitation,
      windSpeed: f ? null : w.windSpeed,
      forecastHumidity: f ? w.humidity : null,
      forecastPrecipitation: f ? w.precipitation : null,
      forecastWindSpeed: f ? w.windSpeed : null,
    };
  });
};

export const getCorrelationChartData = (regionId: string, diseaseId: string, center: Date) =>
  observed(getRecords(regionId, diseaseId, center)).map((r) => ({
    date: r.label,
    cases: r.cases,
    temperature: r.temperature,
  }));

export function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

const strengthOf = (r: number): CorrelationFactor['strength'] => {
  const a = Math.abs(r);
  if (a >= 0.8) return 'Very strong';
  if (a >= 0.6) return 'Strong';
  if (a >= 0.4) return 'Moderate';
  if (a >= 0.2) return 'Weak';
  return 'Negligible';
};

/** How strongly each weather factor tracked daily cases over the selected 29-day window. */
export function getCorrelationStats(regionId: string, diseaseId: string, center: Date): CorrelationFactor[] {
  const region = findRegion(regionId);
  if (!region) return [];
  const records = observed(getRecords(regionId, diseaseId, center));
  const cases = records.map((r) => r.cases);
  const lagRain = records.map((r) => recentRain(region, parseISO(r.date)));

  const factors: [CorrelationFactor['factor'], number[]][] = [
    ['Temperature', records.map((r) => r.temperature)],
    ['Humidity', records.map((r) => r.humidity)],
    ['Rainfall (10-day lag)', lagRain],
  ];
  return factors.map(([factor, xs]) => {
    const r = Math.round(pearson(xs, cases) * 100) / 100;
    return { factor, r, strength: strengthOf(r) };
  });
}

export const getDailyMapData = (diseaseId: string, date: Date) => {
  const disease = findDisease(diseaseId);
  if (!disease) return [];
  return regions.map((region) => {
    const { cases, deaths } = casesOn(region, disease, date);
    return { ...region, cases, deaths };
  });
};

export const getKpiData = (regionId: string, diseaseId: string, center: Date): KpiData => {
  const data = observed(getRecords(regionId, diseaseId, center));
  const totalCases = data.reduce((acc, r) => acc + r.cases, 0);
  const totalDeaths = data.reduce((acc, r) => acc + r.deaths, 0);
  const firstHalf = data.slice(0, WINDOW_BEFORE).reduce((acc, r) => acc + r.cases, 0);
  const secondHalf = data.slice(WINDOW_BEFORE + 1).reduce((acc, r) => acc + r.cases, 0);

  const periodChange = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const mortalityRate = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;

  return {
    totalCases,
    periodChange: parseFloat(periodChange.toFixed(1)),
    mortalityRate: parseFloat(mortalityRate.toFixed(2)),
  };
};

/** Plain-text summaries of the selected window, passed to the AI insight prompt. */
export function describeWindowForAi(regionId: string, diseaseId: string, center: Date) {
  const records = observed(getRecords(regionId, diseaseId, center));
  const disease = findDisease(diseaseId);
  if (records.length === 0 || !disease) return { weather: 'No weather data available.', disease: 'No case data available.' };

  const avg = (k: 'temperature' | 'humidity' | 'windSpeed') =>
    (records.reduce((a, r) => a + r[k], 0) / records.length).toFixed(1);
  const rain = records.reduce((a, r) => a + r.precipitation, 0).toFixed(1);
  const rainyDays = records.filter((r) => r.precipitation > 0).length;
  const temps = records.map((r) => r.temperature);
  const kpi = getKpiData(regionId, diseaseId, center);
  const corr = getCorrelationStats(regionId, diseaseId, center)
    .map((c) => `${c.factor}: r = ${c.r} (${c.strength.toLowerCase()})`)
    .join('; ');
  const peak = records.reduce((best, r) => (r.cases > best.cases ? r : best), records[0]);

  return {
    weather:
      `Over ${records.length} days (${records[0].date} to ${records[records.length - 1].date}): ` +
      `average temperature ${avg('temperature')}°C (range ${Math.min(...temps)} to ${Math.max(...temps)}°C), ` +
      `average humidity ${avg('humidity')}%, total rainfall ${rain} mm across ${rainyDays} rainy days, ` +
      `average wind ${avg('windSpeed')} km/h.`,
    disease:
      `${disease.name} (${disease.transmission === 'vector' ? 'mosquito-borne' : 'water-borne'}): ` +
      `${kpi.totalCases} cases in the period, ${kpi.periodChange >= 0 ? '+' : ''}${kpi.periodChange}% in the second half vs the first, ` +
      `case fatality ${kpi.mortalityRate}%. Peak of ${peak.cases} cases on ${peak.date}. ` +
      `Correlation of daily cases with weather: ${corr}.`,
  };
}

/** CSV of the selected window, one row per day. Projected days are marked. */
export function recordsToCsv(sets: { region: string; disease: string; records: DailyRecord[] }[]) {
  const header = 'Region,Disease,Date,Type,Cases,Deaths,Temperature (°C),Humidity (%),Rainfall (mm),Wind (km/h),Conditions';
  const rows = sets.flatMap(({ region, disease, records }) =>
    records.map((r) =>
      [region, disease, r.date, r.isForecast ? 'Projected' : 'Observed', r.cases, r.deaths, r.temperature, r.humidity, r.precipitation, r.windSpeed, r.description]
        .map((v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(','),
    ),
  );
  return [header, ...rows].join('\n');
}
