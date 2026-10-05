'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sigma } from 'lucide-react';
import type { CorrelationFactor } from '@/lib/types';

interface CorrelationStrengthProps {
  sets: { label: string; factors: CorrelationFactor[] }[];
}

function Meter({ r }: { r: number }) {
  const width = `${Math.min(100, Math.abs(r) * 100)}%`;
  return (
    <div className="relative h-2 w-full rounded-full bg-muted" aria-hidden>
      <div
        className={`absolute top-0 h-2 rounded-full ${r >= 0 ? 'left-1/2 bg-primary' : 'right-1/2 bg-destructive'}`}
        style={{ width: `calc(${width} / 2)` }}
      />
      <div className="absolute left-1/2 top-[-2px] h-3 w-px bg-border" />
    </div>
  );
}

/** Pearson correlation between each weather factor and daily cases over the selected window. */
export function CorrelationStrength({ sets }: CorrelationStrengthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sigma className="h-5 w-5" /> Weather–disease correlation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pearson r between each factor and daily cases across the 29-day window. Positive means cases rise with the factor.
        </p>
      </CardHeader>
      <CardContent className={`grid gap-6 ${sets.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {sets.map((set) => (
          <div key={set.label} className="space-y-4">
            {sets.length > 1 && <h4 className="text-sm font-semibold">{set.label}</h4>}
            {set.factors.map((f) => (
              <div key={f.factor} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{f.factor}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{f.r > 0 ? '+' : ''}{f.r.toFixed(2)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{f.strength}</span>
                  </span>
                </div>
                <Meter r={f.r} />
              </div>
            ))}
          </div>
        ))}
        <p className={`text-xs text-muted-foreground ${sets.length > 1 ? 'md:col-span-2' : ''}`}>
          Correlation is not causation, and 29 days is a small sample. Treat these as hints for where to look.
        </p>
      </CardContent>
    </Card>
  );
}
