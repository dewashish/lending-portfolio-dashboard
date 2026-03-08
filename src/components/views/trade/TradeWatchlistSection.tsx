'use client';

import { WatchlistTable } from '@/components/tables/WatchlistTable';
import { useTradeWatchlist } from '@/hooks/useTradeData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeWatchlistSection({ scope }: Props) {
  const { data: watchlist, isLoading } = useTradeWatchlist(scope);

  if (isLoading) return <LoadingSkeleton />;

  return <WatchlistTable data={watchlist ?? []} />;
}
