'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ChartRow } from '@/lib/types';

const chartConfig = {
  temperature: {
    label: 'Temperature (°C)',
    color: 'hsl(var(--chart-4))',
  },
  forecastTemp: {
    label: 'Projected (°C)',
    color: 'hsl(var(--chart-4))',
  },
  compareTemp: {
    label: 'Comparison (°C)',
    color: 'hsl(var(--chart-5))',
  },
  compareForecastTemp: {
    label: 'Comparison projected (°C)',
    color: 'hsl(var(--chart-5))',
  }
} satisfies ChartConfig;

interface TemperatureTrendsChartProps {
  data: ChartRow[];
  showForecast: boolean;
  comparisonMode: boolean;
  seriesLabels?: { a: string, b: string };
  isAnimationActive?: boolean;
}

export function TemperatureTrendsChart({ data, showForecast, comparisonMode, seriesLabels, isAnimationActive = true }: TemperatureTrendsChartProps) {
  if (!data || data.length === 0) {
    return <div className="w-full h-[350px] flex items-center justify-center text-muted-foreground">No data available</div>;
  }
  
  const dynamicConfig: ChartConfig = JSON.parse(JSON.stringify(chartConfig));
    if (comparisonMode && seriesLabels) {
        dynamicConfig.temperature.label = `${seriesLabels.a} (°C)`;
        dynamicConfig.compareTemp.label = `${seriesLabels.b} (°C)`;
        dynamicConfig.forecastTemp.label = `${seriesLabels.a} projected`;
        dynamicConfig.compareForecastTemp.label = `${seriesLabels.b} projected`;
    }

  return (
    <ChartContainer config={dynamicConfig} className="w-full h-[350px]">
      <LineChart data={data} margin={{ left: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.12)" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}°C`}
          domain={['auto', 'auto']}
          allowDecimals={false}
          label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12, dy: 55 }}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--foreground) / 0.2)' }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line isAnimationActive={isAnimationActive} dataKey="temperature" type="monotone" stroke="var(--color-temperature)" strokeWidth={2.5} dot={false} connectNulls />
        {comparisonMode && <Line isAnimationActive={isAnimationActive} dataKey="compareTemp" type="monotone" stroke="var(--color-compareTemp)" strokeWidth={2} dot={false} connectNulls />}
        {showForecast && <Line isAnimationActive={isAnimationActive} dataKey="forecastTemp" type="monotone" stroke="var(--color-forecastTemp)" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls />}
        {showForecast && comparisonMode && <Line isAnimationActive={isAnimationActive} dataKey="compareForecastTemp" type="monotone" stroke="var(--color-compareForecastTemp)" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls />}
      </LineChart>
    </ChartContainer>
  );
}
