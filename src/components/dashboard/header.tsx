'use client';

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="z-30 flex items-start gap-3 px-4 py-3 md:sticky md:top-0 md:items-center md:px-8">
      {children}
    </header>
  );
}
