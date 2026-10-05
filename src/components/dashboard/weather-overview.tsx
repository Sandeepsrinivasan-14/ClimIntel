'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Thermometer, Droplets, Wind, CloudRain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeatherData } from '@/lib/weather';

interface WeatherOverviewProps {
  title: string;
  weatherData: WeatherData | null;
  loading: boolean;
  lastUpdated: Date | null;
  /** Two columns instead of four, for the side-by-side compare view. */
  compact?: boolean;
}

export function WeatherOverview({ title, weatherData, loading, lastUpdated, compact = false }: WeatherOverviewProps) {
  const grid = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3 lg:grid-cols-4';

  const tiles = weatherData
    ? [
        { label: 'Temperature', value: `${weatherData.temp_c}°C`, note: weatherData.condition.text, icon: Thermometer, tint: 'text-[hsl(var(--chart-4))]' },
        { label: 'Humidity', value: `${weatherData.humidity}%`, note: 'Relative humidity', icon: Droplets, tint: 'text-[hsl(var(--chart-2))]' },
        { label: 'Wind', value: `${weatherData.wind_kph} km/h`, note: 'Average speed', icon: Wind, tint: 'text-muted-foreground' },
        { label: 'Rain', value: `${weatherData.precip_mm} mm`, note: 'Today so far', icon: CloudRain, tint: 'text-[hsl(var(--chart-3))]' },
      ]
    : [];

  const source = weatherData?.source === 'live'
    ? `Live from WeatherAPI${lastUpdated ? `, updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : ''}`
    : 'Simulated from the city’s climate baseline. Add a WeatherAPI key for live data.';

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {weatherData && <p className="text-xs text-muted-foreground">{source}</p>}
      </div>
      {loading ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : !weatherData ? (
        <div className="glass rounded-xl p-4 text-sm text-muted-foreground">Weather is unavailable for this city right now. Try another city or reload.</div>
      ) : (
        <div className={grid}>
          {tiles.map(({ label, value, note, icon: Icon, tint }) => (
            <div key={label} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {label}
                {label === 'Temperature' && weatherData.condition.icon ? (
                  <Image src={weatherData.condition.icon} alt="" width={22} height={22} />
                ) : (
                  <Icon className={`h-4 w-4 ${tint}`} aria-hidden />
                )}
              </div>
              <p className="mt-1 font-headline text-2xl font-semibold tabular-nums">{value}</p>
              <p className="truncate text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
