/** ClimIntel mark: a heat arc over a monsoon arc around a single case point. */
export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-heat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--accent))" />
          <stop offset="1" stopColor="hsl(var(--chart-1))" />
        </linearGradient>
        <linearGradient id="ci-rain" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="hsl(var(--chart-3))" />
          <stop offset="1" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <path d="M5 17a11 11 0 0 1 22 0" fill="none" stroke="url(#ci-heat)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M27 17a11 11 0 0 1-22 0" fill="none" stroke="url(#ci-rain)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="4 3.2" />
      <circle cx="16" cy="17" r="3.6" fill="hsl(var(--chart-1))" />
    </svg>
  );
}
