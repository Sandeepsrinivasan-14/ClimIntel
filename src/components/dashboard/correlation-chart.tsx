'use client';

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ChartRow } from '@/lib/types';

const chartConfig = {
  cases: {
    label: 'Cases',
    color: 'hsl(var(--chart-1))',
  },
  temperature: {
    label: 'Temperature (°C)',
    color: 'hsl(var(--chart-4))',
  },
  compareCases: {
    label: 'Comparison cases',
    color: 'hsl(var(--chart-5))',
  },
  compareTemperature: {
    label: 'Comparison temperature (°C)',
    color: 'hsl(var(--chart-3))',
  }
} satisfies ChartConfig;

interface CorrelationChartProps {
  data: ChartRow[];
  comparisonMode: boolean;
  seriesLabels?: { a: string, b: string };
  isAnimationActive?: boolean;
}

export function CorrelationChart({ data, comparisonMode, seriesLabels, isAnimationActive = true }: CorrelationChartProps) {
    const dynamicConfig: ChartConfig = JSON.parse(JSON.stringify(chartConfig));
    if (comparisonMode && seriesLabels) {
        dynamicConfig.cases.label = `${seriesLabels.a} Cases`;
        dynamicConfig.temperature.label = `${seriesLabels.a} Temp (°C)`;
        dynamicConfig.compareCases.label = `${seriesLabels.b} Cases`;
        dynamicConfig.compareTemperature.label = `${seriesLabels.b} Temp (°C)`;
    }

  return (
    <ChartContainer config={dynamicConfig} className="w-full h-[350px]">
      <ComposedChart data={data} margin={{ left: 4, right: 12 }}>
        <defs>
          <linearGradient id="corr-cases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cases)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-cases)" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="corr-compareCases" x1="0" y1="0" x2="0" y2="1">
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
        />
        <YAxis
          yAxisId="left"
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          label={{ value: 'Cases', angle: -90, position: 'insideLeft', fill: 'hsl(var(--chart-1))', dy: 40 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(value) => `${value}°C`}
          label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight', fill: 'hsl(var(--chart-4))', dy: -55, offset: -2 }}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar isAnimationActive={isAnimationActive} dataKey="cases" yAxisId="left" fill="url(#corr-cases)" radius={[4, 4, 0, 0]} />
        {comparisonMode && <Bar isAnimationActive={isAnimationActive} dataKey="compareCases" yAxisId="left" fill="url(#corr-compareCases)" radius={[4, 4, 0, 0]} />}
        
        <Line isAnimationActive={isAnimationActive} dataKey="temperature" yAxisId="right" type="monotone" stroke="var(--color-temperature)" strokeWidth={2.5} dot={false} />
        {comparisonMode && <Line isAnimationActive={isAnimationActive} dataKey="compareTemperature" yAxisId="right" type="monotone" stroke="var(--color-compareTemperature)" strokeWidth={2} dot={false} />}
      </ComposedChart>
    </ChartContainer>
  );
}
