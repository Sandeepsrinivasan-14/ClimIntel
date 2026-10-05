'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseSearchQueryAction } from '@/app/actions';
import type { Region, Disease, ParseSearchQueryOutput } from '@/lib/types';

interface NaturalLanguageSearchProps {
  regions: Region[];
  diseases: Disease[];
  onSearch: (filters: Partial<ParseSearchQueryOutput>) => void;
}

export function NaturalLanguageSearch({ regions, diseases, onSearch }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, startSearchTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;

    startSearchTransition(async () => {
      const result = await parseSearchQueryAction({
        query,
        regions: regions.map(({ id, name }) => ({ id, name })),
        diseases: diseases.map(({ id, name }) => ({ id, name })),
        currentDate: new Date().toISOString().split('T')[0],
      });

      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Search Failed', description: result.error });
        return;
      }
      if (Object.values(result.data).every((v) => !v)) {
        toast({
          title: 'No Filters Found',
          description: "Couldn't find a city, disease or month in that search. Try something like 'malaria in Kolkata August'.",
        });
        return;
      }
      toast({
        title: 'Filters Updated',
        description: result.mode === 'keyword' ? 'Matched by keywords (add a Gemini key for full AI search).' : 'Dashboard updated from your search.',
      });
      onSearch(result.data);
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
      <div className="relative w-full">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
        <Input
          type="text"
          placeholder="e.g., 'dengue in Chennai last month'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isSearching}
          className="pl-9"
          aria-label="Search the dashboard"
        />
      </div>
      <Button type="submit" disabled={isSearching}>
        {isSearching ? '...' : <Search className="h-4 w-4" />}
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}
