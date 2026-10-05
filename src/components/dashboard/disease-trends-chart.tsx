'use client';

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ChartRow } from '@/lib/types';

const chartConfig = {
  cases: {
    label: 'Cases',
    color: 'hsl(var(--chart-1))',
  },
  forecastCases: {
    label: 'Projected',
    color: 'hsl(var(--chart-1))',
  },
  compareCases: {
    label: 'Comparison cases',
    color: 'hsl(var(--chart-5))',
  },
  compareForecastCases: {
    label: 'Comparison projected',
    color: 'hsl(var(--chart-5))',
  }
} satisfies ChartConfig;

interface DiseaseTrendsChartProps {
  data: ChartRow[];
  showForecast: boolean;
  comparisonMode: boolean;
  seriesLabels?: { a: string, b: string };
  isAnimationActive?: boolean;
}

export function DiseaseTrendsChart({ data, showForecast, comparisonMode, seriesLabels, isAnimationActive = true }: DiseaseTrendsChartProps) {
    const dynamicConfig: ChartConfig = JSON.parse(JSON.stringify(chartConfig));
    if (comparisonMode && seriesLabels) {
        dynamicConfig.cases.label = seriesLabels.a;
        dynamicConfig.compareCases.label = seriesLabels.b;
        dynamicConfig.forecastCases.label = `${seriesLabels.a} projected`;
        dynamicConfig.compareForecastCases.label = `${seriesLabels.b} projected`;
    }

  return (
    <ChartContainer config={dynamicConfig} className="w-full h-[350px]">
      <ComposedChart data={data} margin={{ left: 10 }}>
        <defs>
          <linearGradient id="trend-cases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cases)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-cases)" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="trend-compareCases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-compareCases)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-compareCases)" stopOpacity={0.2} />
          </linearGradient>
        </defs>
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
          tickFormatter={(value) => `${value}`}
          label={{ value: 'Daily cases', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12, dy: 40 }}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar isAnimationActive={isAnimationActive} dataKey="cases" fill="url(#trend-cases)" radius={[4, 4, 0, 0]} />
        {comparisonMode && <Bar isAnimationActive={isAnimationActive} dataKey="compareCases" fill="url(#trend-compareCases)" radius={[4, 4, 0, 0]} />}
        {showForecast && <Line isAnimationActive={isAnimationActive} dataKey="forecastCases" stroke="var(--color-forecastCases)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />}
        {showForecast && comparisonMode && <Line isAnimationActive={isAnimationActive} dataKey="compareForecastCases" stroke="var(--color-compareForecastCases)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />}
      </ComposedChart>
    </ChartContainer>
  );
}
