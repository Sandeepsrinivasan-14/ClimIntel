import { describe, expect, it } from 'vitest';
import { keywordSearch } from './keyword-search';

const regions = [
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'navi-mumbai', name: 'Navi Mumbai' },
  { id: 'bangalore', name: 'Bengaluru' },
  { id: 'prayagraj', name: 'Prayagraj' },
  { id: 'delhi', name: 'Delhi' },
];
const diseases = [
  { id: 'dengue', name: 'Dengue' },
  { id: 'malaria', name: 'Malaria' },
];
const today = new Date(2026, 9, 19); // 19 Oct 2026

describe('keywordSearch', () => {
  it('finds city and disease names case-insensitively', () => {
    expect(keywordSearch('DENGUE in delhi', regions, diseases, today)).toMatchObject({ regionId: 'delhi', diseaseId: 'dengue' });
  });

  it('prefers the longest matching city name', () => {
    expect(keywordSearch('malaria in Navi Mumbai', regions, diseases, today).regionId).toBe('navi-mumbai');
  });

  it('understands the old city names Bangalore and Allahabad', () => {
    expect(keywordSearch('Bangalore', regions, diseases, today).regionId).toBe('bangalore');
    expect(keywordSearch('allahabad', regions, diseases, today).regionId).toBe('prayagraj');
  });

  it('handles "this month" and "last month"', () => {
    expect(keywordSearch('this month', regions, diseases, today).date).toBe('2026-10-01');
    expect(keywordSearch('last month', regions, diseases, today).date).toBe('2026-09-01');
  });

  it('handles last month across a year boundary', () => {
    expect(keywordSearch('last month', regions, diseases, new Date(2026, 0, 5)).date).toBe('2025-12-01');
  });

  it('parses a month with an explicit year', () => {
    expect(keywordSearch('August 2023', regions, diseases, today).date).toBe('2023-08-15');
  });

  it('a month later than the current one means the most recent past occurrence', () => {
    expect(keywordSearch('december', regions, diseases, today).date).toBe('2025-12-15');
    expect(keywordSearch('march', regions, diseases, today).date).toBe('2026-03-15');
  });

  it('returns nothing for an unrelated query', () => {
    expect(keywordSearch('hello there', regions, diseases, today)).toEqual({});
  });
});
