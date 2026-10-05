'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Globe } from '@/components/dashboard/globe/globe';
import type { GlobePoint } from '@/components/dashboard/globe/globe-scene';
import type { KpiData } from '@/lib/types';

/** Counts to a new value when it changes (instant when reduced motion is on). */
function useCountUp(value: number, decimals = 0, duration = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return decimals === 0 ? Math.round(shown).toLocaleString() : shown.toFixed(decimals);
}

function Stat({ label, value, decimals = 0, suffix = '', signed = false, hint }: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  signed?: boolean;
  hint: string;
}) {
  const shown = useCountUp(value, decimals);
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-headline text-2xl font-semibold tabular-nums tracking-tight sm:text-4xl">
        {signed && value > 0 ? '+' : ''}
        {shown}
        {suffix}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatRow({ kpi, swatch, title }: { kpi: KpiData; swatch?: string; title?: string }) {
  return (
    <div className="space-y-3">
      {title && (
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: swatch }} />
          {title}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Stat label="Cases" value={kpi.totalCases} hint="Over 29 days" />
        <Stat label="Trend" value={kpi.periodChange} decimals={1} suffix="%" signed hint="vs first fortnight" />
        <Stat label="Fatality" value={kpi.mortalityRate} decimals={2} suffix="%" hint="Deaths per case" />
      </div>
    </div>
  );
}

interface HeroProps {
  diseaseName: string;
  regionName: string;
  date: Date;
  kpi: KpiData;
  compare?: { diseaseName: string; regionName: string; kpi: KpiData };
  points: GlobePoint[];
  selectedId: string;
  compareId?: string;
  onSelect: (id: string) => void;
}

export function Hero({ diseaseName, regionName, date, kpi, compare, points, selectedId, compareId, onSelect }: HeroProps) {
  const direction = kpi.periodChange >= 0 ? 'up' : 'down';
  const headline = compare
    ? `${regionName} and ${compare.regionName}`
    : `${diseaseName} in ${regionName}`;
  const sentence = compare
    ? `${diseaseName} in ${regionName} next to ${compare.diseaseName} in ${compare.regionName}, over the 29 days around ${format(date, 'd MMMM yyyy')}.`
    : `${kpi.totalCases.toLocaleString()} cases over the 29 days around ${format(date, 'd MMMM yyyy')}, ${direction} ${Math.abs(kpi.periodChange)}% on the first fortnight.`;

  return (
    <section className="glass-strong relative overflow-hidden rounded-3xl animate-rise-in" aria-label="Overview">
      <div className="grid items-stretch lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{format(date, 'MMMM yyyy')}</p>
            <h2 className="font-headline text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">{headline}</h2>
            <p className="max-w-[52ch] text-base text-muted-foreground sm:text-lg">{sentence}</p>
          </div>
          <div className="space-y-6">
            <StatRow kpi={kpi} title={compare ? `${diseaseName}, ${regionName}` : undefined} swatch="hsl(var(--accent))" />
            {compare && <StatRow kpi={compare.kpi} title={`${compare.diseaseName}, ${compare.regionName}`} swatch="hsl(var(--chart-5))" />}
          </div>
        </div>
        <div className="relative min-h-[320px] border-t border-border/10 sm:min-h-[400px] lg:border-l lg:border-t-0">
          <div className="absolute inset-0">
            <Globe points={points} selectedId={selectedId} compareId={compareId} onSelect={onSelect} />
          </div>
          <p className="pointer-events-none absolute bottom-3 left-4 right-4 text-xs text-muted-foreground">
            Pillar height is {diseaseName.toLowerCase()} cases on {format(date, 'd MMM')}. Drag to turn the globe, click a city to open it.
          </p>
        </div>
      </div>
    </section>
  );
}
