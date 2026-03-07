import type { TradeFacility, FilterState } from './types';

export function filterTradeFacilities(
  facilities: TradeFacility[],
  filters: FilterState,
): TradeFacility[] {
  return facilities.filter(f => {
    if (filters.entities.length && !filters.entities.includes(f.entity)) return false;
    if (filters.countries.length && !filters.countries.includes(f.country)) return false;
    if (filters.products.length && !filters.products.includes(f.productType)) return false;
    if (filters.ifrsStages.length && !filters.ifrsStages.includes(f.ifrs9Stage)) return false;
    if (filters.riskGrades.length) {
      const rating = f.internalRating;
      const matchesGrade = filters.riskGrades.some(g => {
        if (g === 'A') return rating <= 2;
        if (g === 'B') return rating >= 3 && rating <= 4;
        if (g === 'C') return rating >= 5 && rating <= 6;
        if (g === 'D') return rating >= 7 && rating <= 8;
        if (g === 'E') return rating >= 9;
        return false;
      });
      if (!matchesGrade) return false;
    }
    if (filters.dateRange.from) {
      const from = new Date(filters.dateRange.from);
      const start = new Date(f.startDate);
      if (start < from) return false;
    }
    if (filters.dateRange.to) {
      const to = new Date(filters.dateRange.to);
      const start = new Date(f.startDate);
      if (start > to) return false;
    }
    return true;
  });
}
