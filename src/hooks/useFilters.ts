'use client';

import { useState, useCallback } from 'react';
import type { FilterState } from '@/lib/types';
import { DEFAULT_FILTERS } from '@/lib/constants';

export function useFilters() {
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilters = useCallback((update: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'dateRange') {
      const dr = val as FilterState['dateRange'];
      return dr.from !== null || dr.to !== null;
    }
    return Array.isArray(val) && val.length > 0;
  });

  return { filters, setFilters, resetFilters, hasActiveFilters };
}
