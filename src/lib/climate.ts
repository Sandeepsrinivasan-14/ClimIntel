import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getMonth, subDays } from 'date-fns';
import type { Region, DailyWeather } from './types';

/**
 * Simulated daily weather.
 *
 * Every value is deterministic: the same city and date always give the same
 * weather, no matter which date range is being viewed. Values are built from
 * the city's November baseline (see regions.ts), a seasonal curve, a slow
 * multi-day wave and a little day-to-day noise.
 */

export const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashString = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

/** Seasonal temperature offset (°C) for a north-Indian city, January to December. */
const SEASONAL_TEMP = [-10, -8, -5, 2, 5, 4, 2, 2, 0, -4, -7, -9];
const NOVEMBER = 10;

/** Typical rainfall (mm/day) by month for the south-west monsoon pattern. */
const SW_MONSOON_RAIN = [0.5, 0.6, 0.5, 0.6, 1.5, 5, 9, 8, 5, 2, 0.8, 0.3];
/** South-east coast (Tamil Nadu, Puducherry) gets most rain from the north-east monsoon. */
const NE_MONSOON_RAIN = [1.2, 0.4, 0.3, 0.5, 1.2, 1.5, 2.8, 3.8, 4, 9, 11, 5];

const isMonsoonMonth = (month: number) => month >= 5 && month <= 8;
const isSouthEastCoast = (r: Region) => r.lat < 14 && r.lng > 78.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

const EPOCH = new Date(2020, 0, 1);

export function weatherOn(region: Region, date: Date): DailyWeather {
  const month = getMonth(date);
  const day = differenceInCalendarDays(date, EPOCH);
  const rand = mulberry32(hashString(`${region.id}|${format(date, 'yyyy-MM-dd')}`));
  const base = region.climate;

  // Seasonal swing is large in the north and small near the equator.
  const seasonAmp = clamp((region.lat - 10) / 18, 0.15, 1);
  const wave = Math.sin((day + hashString(region.id) % 17) / 4.5);

  const temperature = round1(
    base.temp + seasonAmp * (SEASONAL_TEMP[month] - SEASONAL_TEMP[NOVEMBER]) + wave * 1.4 + (rand() - 0.5) * 1.6,
  );

  // Humidity rises in the south-west monsoon and drops in the dry pre-monsoon months in the north.
  // The south-east coast is the exception: it is in the rain shadow from June to September and
  // gets its humid season (which the November baseline already reflects) from the north-east monsoon.
  let humidityShift = isMonsoonMonth(month) ? 12 : 0;
  if (isSouthEastCoast(region)) humidityShift = isMonsoonMonth(month) ? -14 : month <= 3 ? -6 : 0;
  else if (month >= 2 && month <= 4 && region.lat > 20) humidityShift = -15;
  const humidity = Math.round(clamp(base.humidity + humidityShift - wave * 3 + (rand() - 0.5) * 8, 15, 96));

  // Rainfall: wetter cities (higher baseline humidity) get more of the seasonal rain.
  const wetness = clamp((base.humidity - 40) / 40, 0.4, 1.6);
  const pattern = isSouthEastCoast(region) ? NE_MONSOON_RAIN : SW_MONSOON_RAIN;
  const expected = Math.max(base.precip, pattern[month] * wetness);
  const rainChance = clamp(expected / 6, 0.05, 0.85);
  const precipitation = rand() < rainChance ? round1((expected / rainChance) * (0.3 + rand() * 1.4)) : 0;

  const windSpeed = round1(clamp(base.wind * (isMonsoonMonth(month) ? 1.3 : 1) + wave * 1.5 + (rand() - 0.5) * 4, 0.5, 60));

  const description =
    precipitation > 20 ? 'Heavy rain'
    : precipitation > 5 ? 'Moderate rain'
    : precipitation > 0 ? 'Light rain'
    : humidity > 80 ? 'Overcast'
    : humidity > 60 ? 'Partly cloudy'
    : 'Clear sky';

  return { date: format(date, 'yyyy-MM-dd'), temperature, humidity, precipitation, windSpeed, description };
}

/** Days shown on the dashboard: 14 before the selected date, the date itself, and 14 after. */
export const WINDOW_BEFORE = 14;
export const WINDOW_AFTER = 14;
/** Days projected past the window when the forecast toggle is on. */
export const FORECAST_DAYS = 7;

export function windowDays(center: Date) {
  return eachDayOfInterval({ start: subDays(center, WINDOW_BEFORE), end: addDays(center, WINDOW_AFTER) });
}

export function forecastDays(center: Date) {
  return eachDayOfInterval({
    start: addDays(center, WINDOW_AFTER + 1),
    end: addDays(center, WINDOW_AFTER + FORECAST_DAYS),
  });
}

/** Total rain over the `days` days before `date` (used as a lagged breeding-site signal). */
export function recentRain(region: Region, date: Date, days = 10) {
  let total = 0;
  for (let i = 1; i <= days; i++) total += weatherOn(region, subDays(date, i)).precipitation;
  return total;
}
