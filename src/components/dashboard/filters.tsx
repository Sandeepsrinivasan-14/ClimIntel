'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Region, Disease, FilterSet } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FiltersProps {
  regions: Region[];
  diseases: Disease[];
  filters: FilterSet;
  onFilterChange: (newFilters: Partial<FilterSet>) => void;
  title?: string;
  disabled?: boolean;
}

export function Filters({ regions, diseases, filters, onFilterChange, title = 'Filters', disabled = false }: FiltersProps) {
  return (
    <fieldset disabled={disabled} className="space-y-4 group-data-[collapsible=icon]:hidden p-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Select value={filters.regionId} onValueChange={(value) => onFilterChange({ regionId: value })}>
          <SelectTrigger id="region" className="w-full">
            <SelectValue placeholder="Select Region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="disease">Disease</Label>
        <Select value={filters.diseaseId} onValueChange={(value) => onFilterChange({ diseaseId: value })}>
          <SelectTrigger id="disease" className="w-full">
            <SelectValue placeholder="Select Disease" />
          </SelectTrigger>
          <SelectContent>
            {diseases.map((disease) => (
              <SelectItem key={disease.id} value={disease.id}>{disease.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="time">Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="time"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !filters.date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date ? format(filters.date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filters.date ?? undefined}
              onSelect={(date) => date && onFilterChange({ date })}
              fromYear={2015}
              toYear={new Date().getFullYear()}
              disabled={{ after: new Date() }}
              captionLayout="dropdown-buttons"
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </fieldset>
  );
}
