'use server';

import type { Region } from './types';
import { weatherOn } from './climate';

export interface WeatherData {
  temp_c: number;
  humidity: number;
  wind_kph: number;
  precip_mm: number;
  condition: {
    text: string;
    icon: string;
  };
  /** 'live' when it came from WeatherAPI.com, 'simulated' when it came from the city's climate baseline. */
  source: 'live' | 'simulated';
}

function simulatedNow(region: Region): WeatherData {
  const w = weatherOn(region, new Date());
  return {
    temp_c: w.temperature,
    humidity: w.humidity,
    wind_kph: w.windSpeed,
    precip_mm: w.precipitation,
    condition: { text: w.description, icon: '' },
    source: 'simulated',
  };
}

/**
 * Current weather for a city.
 *
 * Uses WeatherAPI.com when WEATHER_API_KEY is set. Without a key, or if the
 * request fails, it falls back to the simulated value for today so the
 * dashboard always has something sensible to show.
 */
export async function getRealtimeWeather(region: Region): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return simulatedNow(region);

  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${region.lat},${region.lng}&aqi=no`;
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      console.error(`WeatherAPI request failed (${response.status}); using simulated weather.`);
      return simulatedNow(region);
    }
    const { current } = await response.json();
    return {
      temp_c: current.temp_c,
      humidity: current.humidity,
      wind_kph: current.wind_kph,
      precip_mm: current.precip_mm,
      condition: { text: current.condition.text, icon: `https:${current.condition.icon}` },
      source: 'live',
    };
  } catch (error) {
    console.error('WeatherAPI request errored; using simulated weather.', error);
    return simulatedNow(region);
  }
}
