import { format, startOfMonth, subMonths } from 'date-fns';
import type { ParseSearchQueryOutput } from './types';

type Named = { id: string; name: string };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Offline fallback for the search bar when no Gemini key is configured.
 * Understands city and disease names, month names (optionally with a year),
 * "this month" and "last month".
 */
export function keywordSearch(query: string, regions: Named[], diseases: Named[], today = new Date()): ParseSearchQueryOutput {
  const q = query.toLowerCase();
  const out: ParseSearchQueryOutput = {};

  // Longest name first so "Navi Mumbai" wins over "Mumbai".
  const byLength = (a: Named, b: Named) => b.name.length - a.name.length;
  const region = [...regions].sort(byLength).find((r) => q.includes(r.name.toLowerCase()) || q.includes(r.id));
  if (region) out.regionId = region.id;
  if (!region && q.includes('bangalore')) out.regionId = regions.find((r) => r.id === 'bangalore')?.id;
  if (!region && q.includes('allahabad')) out.regionId = regions.find((r) => r.id === 'prayagraj')?.id;

  const disease = diseases.find((d) => q.includes(d.name.toLowerCase()));
  if (disease) out.diseaseId = disease.id;

  if (q.includes('last month')) {
    out.date = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  } else if (q.includes('this month')) {
    out.date = format(startOfMonth(today), 'yyyy-MM-dd');
  } else {
    const match = q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/);
    if (match) {
      const month = MONTHS.indexOf(match[1]);
      let year = match[2] ? Number(match[2]) : today.getFullYear();
      if (!match[2] && month > today.getMonth()) year -= 1; // "August" means the most recent August
      out.date = format(new Date(year, month, 15), 'yyyy-MM-dd');
    }
  }
  return out;
}
