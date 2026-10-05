'use client';

import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WeatherMetric } from '@/lib/data';
import type { ChartRow } from '@/lib/types';

const METRICS: Record<WeatherMetric, { label: string; unit: string; kind: 'line' | 'bar'; color: string }> = {
  humidity: { label: 'Humidity', unit: '%', kind: 'line', color: 'hsl(var(--chart-2))' },
  precipitation: { label: 'Rainfall', unit: 'mm', kind: 'bar', color: 'hsl(var(--chart-3))' },
  windSpeed: { label: 'Wind', unit: 'km/h', kind: 'line', color: 'hsl(var(--muted-foreground))' },
};

const forecastKey = (m: WeatherMetric) => `forecast${m.charAt(0).toUpperCase()}${m.slice(1)}`;

type SeriesKey = 'a' | 'aForecast' | 'b' | 'bForecast';

interface WeatherTrendsChartProps {
  data: ChartRow[];
  compareData?: ChartRow[];
  showForecast: boolean;
  seriesLabels: { a: string; b: string };
  isAnimationActive?: boolean;
}

/** Humidity, rainfall and wind for the selected window, with labelled axes. */
export function WeatherTrendsChart({ data, compareData, showForecast, seriesLabels, isAnimationActive = true }: WeatherTrendsChartProps) {
  const [metric, setMetric] = useState<WeatherMetric>('humidity');
  const m = METRICS[metric];
  const fKey = forecastKey(metric);

  const rows = data.map((row, i) => ({
    date: row.date,
    a: row[metric],
    aForecast: row[fKey],
    b: compareData?.[i]?.[metric] ?? null,
    bForecast: compareData?.[i]?.[fKey] ?? null,
  }));

  const nameA = compareData ? seriesLabels.a : m.label;
  const config = {
    a: { label: nameA, color: m.color },
    aForecast: { label: `${nameA} (projected)`, color: m.color },
    b: { label: seriesLabels.b, color: 'hsl(var(--chart-5))' },
    bForecast: { label: `${seriesLabels.b} (projected)`, color: 'hsl(var(--chart-5))' },
  } satisfies ChartConfig;

  const visible: SeriesKey[] = ['a'];
  if (compareData) visible.push('b');
  if (showForecast) visible.push('aForecast');
  if (showForecast && compareData) visible.push('bForecast');

  const renderSeries = (key: SeriesKey) => {
    const projected = key.endsWith('Forecast');
    if (m.kind === 'bar') {
      return (
        <Bar
          key={key}
          dataKey={key}
          fill={`var(--color-${key})`}
          fillOpacity={projected ? 0.45 : 1}
          radius={[4, 4, 0, 0]}
          isAnimationActive={isAnimationActive}
        />
      );
    }
    return (
      <Line
        key={key}
        dataKey={key}
        type="monotone"
        stroke={`var(--color-${key})`}
        strokeWidth={2}
        strokeDasharray={projected ? '5 5' : undefined}
        dot={false}
        connectNulls
        isAnimationActive={isAnimationActive}
      />
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={metric} onValueChange={(v) => setMetric(v as WeatherMetric)}>
        <TabsList>
          {(Object.keys(METRICS) as WeatherMetric[]).map((k) => (
            <TabsTrigger key={k} value={k}>{METRICS[k].label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <ChartContainer config={config} className="w-full h-[320px]">
        <ComposedChart data={rows} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.12)" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            label={{ value: 'Date', position: 'insideBottom', offset: -15, fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{ value: `${m.label} (${m.unit})`, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12, dy: 50 }}
          />
          <Tooltip content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
          {visible.map(renderSeries)}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
