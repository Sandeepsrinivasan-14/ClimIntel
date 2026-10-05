'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { GlobePoint, GlobeSceneProps } from './globe-scene';

// three.js only runs in the browser, and it is large, so load it after the page.
const GlobeScene = dynamic(() => import('./globe-scene'), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="aspect-square w-3/5 max-w-[320px] animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/0.35),hsl(var(--background)/0.2)_70%)]" />
    </div>
  );
}

/** If WebGL is unavailable the rest of the dashboard still works; the globe just steps aside. */
class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          The 3D globe needs WebGL, which this browser has turned off. The map below shows the same data.
        </div>
      );
    }
    return this.props.children;
  }
}

const token = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.split(' ').slice(0, 3).join(', ')})` : '#888';
};

function useThemeColors(): GlobeSceneProps['colors'] | null {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<GlobeSceneProps['colors'] | null>(null);
  useEffect(() => {
    // Wait a frame so next-themes has applied the class before reading tokens.
    const id = requestAnimationFrame(() =>
      setColors({
        land: token('--foreground'),
        pillar: token('--chart-1'),
        selected: token('--accent'),
        compare: token('--chart-5'),
        atmosphere: token('--glow-teal'),
        ocean: token('--secondary'),
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);
  return colors;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  return reduced;
}

interface GlobeProps {
  points: GlobePoint[];
  selectedId: string;
  compareId?: string;
  onSelect?: (id: string) => void;
}

export function Globe(props: GlobeProps) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  return (
    <div className="relative h-full w-full" aria-label="3D globe showing cases by city" role="img">
      <GlobeBoundary>{colors ? <GlobeScene {...props} colors={colors} reducedMotion={reducedMotion} /> : <GlobePlaceholder />}</GlobeBoundary>
    </div>
  );
}
