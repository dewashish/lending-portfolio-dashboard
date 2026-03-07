'use client';

import useSWR from 'swr';
import type { PortfolioData } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function usePortfolioData() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioData>(
    '/api/portfolio',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );
  return { portfolio: data ?? null, error, isLoading, refresh: mutate };
}

export function useDataLoader() {
  const reload = async (force = true) => {
    const res = await fetch(`/api/data-loader?force=${force}`);
    return res.json();
  };
  return { reload };
}
