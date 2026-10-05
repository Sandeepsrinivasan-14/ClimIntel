'use client';

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { INDIA_STATES, INDIA_VIEWBOX } from '@/lib/india-map';
import type { Region } from '@/lib/types';

interface MapPoint extends Region {
  cases: number;
  deaths: number;
}

interface InteractiveMapProps {
  data: MapPoint[];
  selectedId: string;
  compareId?: string;
  onSelect?: (regionId: string) => void;
}

/**
 * Projects latitude/longitude onto the India SVG (Mercator).
 * Calibrated against state extremes; every city lands inside its own state.
 */
const mercator = (lat: number) => (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export function projectToMap(lat: number, lng: number) {
  return { x: (lng - 68.16) * 20.918, y: -20.972 * mercator(lat) + 837.756 };
}

export function InteractiveMap({ data, selectedId, compareId, onSelect }: InteractiveMapProps) {
  const maxCases = useMemo(() => Math.max(1, ...data.map((d) => d.cases)), [data]);
  // Draw the largest bubbles first so small ones stay clickable on top.
  const points = useMemo(() => [...data].sort((a, b) => b.cases - a.cases), [data]);

  return (
    <div className="w-full">
      <TooltipProvider delayDuration={0}>
        <svg viewBox={INDIA_VIEWBOX} className="h-[440px] w-full" role="img" aria-label="Map of India showing cases by city">
          <g>
            {INDIA_STATES.map((s) => (
              <path key={s.id} d={s.path} className="fill-foreground/[0.07] stroke-foreground/20" strokeWidth={0.7}>
                <title>{s.name}</title>
              </path>
            ))}
          </g>
          <g>
            {points.map((p) => {
              const { x, y } = projectToMap(p.lat, p.lng);
              const r = 3 + Math.sqrt(p.cases / maxCases) * 9;
              const isA = p.id === selectedId;
              const isB = p.id === compareId;
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      className={
                        isA ? 'fill-accent stroke-background'
                        : isB ? 'fill-chart-5 stroke-background'
                        : 'fill-chart-1/40 stroke-chart-1/80 hover:fill-chart-1/75'
                      }
                      strokeWidth={isA || isB ? 2 : 0.8}
                      style={{ cursor: onSelect ? 'pointer' : 'default' }}
                      onClick={() => onSelect?.(p.id)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{p.name}</p>
                    <p>Cases: {p.cases.toLocaleString()}</p>
                    <p>Deaths: {p.deaths.toLocaleString()}</p>
                    {onSelect && !isA && <p className="text-xs text-muted-foreground">Click to select</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </g>
        </svg>
      </TooltipProvider>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Bubble size is that day’s cases (simulated)</span>
        <a
          className="underline-offset-2 hover:underline"
          href="https://github.com/VictorCazanave/svg-maps"
          target="_blank"
          rel="noreferrer"
        >
          Map: svg-maps, CC BY 4.0
        </a>
      </div>
    </div>
  );
}
