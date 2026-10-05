'use client';

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface TimelineControlsProps {
  months: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

/** Month scrubber for the last 12 months, with a play button that steps through them. */
export function TimelineControls({ months, currentIndex, onIndexChange, isPlaying, onTogglePlay }: TimelineControlsProps) {
  const hasData = months.length > 0;

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={onTogglePlay}
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full"
        disabled={!hasData}
        aria-label={isPlaying ? 'Pause' : 'Play through the months'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </Button>
      <p className="w-20 shrink-0 font-headline text-lg font-semibold tabular-nums" aria-live="polite">
        {hasData ? months[currentIndex] : '…'}
      </p>
      <div className="min-w-0 flex-1 space-y-2">
        <Slider
          aria-label="Month"
          min={0}
          max={hasData ? months.length - 1 : 0}
          step={1}
          value={[currentIndex]}
          onValueChange={(value) => onIndexChange(value[0])}
          disabled={!hasData}
        />
        <div className="hidden justify-between text-[11px] text-muted-foreground sm:flex" aria-hidden>
          {months.map((m, i) => (
            <span key={m} className={i === currentIndex ? 'font-semibold text-foreground' : undefined}>
              {m.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
