import { describe, expect, it } from 'vitest';
import { FORECAST_DAYS, WINDOW_AFTER, WINDOW_BEFORE, forecastDays, hashString, mulberry32, recentRain, weatherOn, windowDays } from './climate';
import { regions } from './regions';

const delhi = regions.find((r) => r.id === 'delhi')!;
const chennai = regions.find((r) => r.id === 'chennai')!;

describe('mulberry32 / hashString', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashString is stable and differs for different text', () => {
    expect(hashString('delhi')).toBe(hashString('delhi'));
    expect(hashString('delhi')).not.toBe(hashString('chennai'));
  });
});

describe('weatherOn', () => {
  it('gives the same weather for the same city and date', () => {
    const d = new Date(2024, 5, 10);
    expect(weatherOn(delhi, d)).toEqual(weatherOn(delhi, d));
  });

  it('formats the date and keeps values in sensible ranges for every city all year', () => {
    for (const region of regions) {
      for (let m = 0; m < 12; m++) {
        const w = weatherOn(region, new Date(2024, m, 15));
        expect(w.date).toBe(`2024-${String(m + 1).padStart(2, '0')}-15`);
        expect(w.humidity).toBeGreaterThanOrEqual(15);
        expect(w.humidity).toBeLessThanOrEqual(96);
        expect(w.precipitation).toBeGreaterThanOrEqual(0);
        expect(w.windSpeed).toBeGreaterThanOrEqual(0.5);
        expect(w.windSpeed).toBeLessThanOrEqual(60);
        expect(w.description).toBeTruthy();
      }
    }
  });

  it('Delhi is hotter in June than in January', () => {
    const avg = (month: number) => {
      let t = 0;
      for (let d = 1; d <= 28; d++) t += weatherOn(delhi, new Date(2024, month, d)).temperature;
      return t / 28;
    };
    expect(avg(5)).toBeGreaterThan(avg(0));
  });

  it('Chennai gets more rain in November (north-east monsoon) than in March', () => {
    expect(recentRain(chennai, new Date(2024, 10, 30), 30)).toBeGreaterThan(recentRain(chennai, new Date(2024, 2, 30), 30));
  });
});

describe('date windows', () => {
  const center = new Date(2024, 7, 15);

  it('windowDays spans 14 days before to 14 days after, inclusive', () => {
    const days = windowDays(center);
    expect(days).toHaveLength(WINDOW_BEFORE + WINDOW_AFTER + 1);
    expect(days[WINDOW_BEFORE].getTime()).toBe(center.getTime());
  });

  it('forecastDays starts the day after the window and runs FORECAST_DAYS', () => {
    const days = forecastDays(center);
    const lastWindowDay = windowDays(center).at(-1)!;
    expect(days).toHaveLength(FORECAST_DAYS);
    expect(days[0].getTime() - lastWindowDay.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('recentRain', () => {
  it('equals the sum of the previous days and ignores the date itself', () => {
    const date = new Date(2024, 8, 10);
    let sum = 0;
    for (let i = 1; i <= 10; i++) sum += weatherOn(delhi, new Date(2024, 8, 10 - i)).precipitation;
    expect(recentRain(delhi, date)).toBeCloseTo(sum, 6);
  });
});
