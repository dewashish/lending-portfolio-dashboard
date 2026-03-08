'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { PortfolioTable } from '@/components/tables/PortfolioTable';
import { formatCurrencyMM, formatNumber, formatRating } from '@/lib/format';
import type { WatchlistAccount } from '@/lib/types';

const col = createColumnHelper<WatchlistAccount>();

const columns = [
  col.accessor('facilityRef', { header: 'Facility' }),
  col.accessor('entity', { header: 'Entity' }),
  col.accessor('obligorName', { header: 'Obligor' }),
  col.accessor('productType', { header: 'Product' }),
  col.accessor('outstanding', {
    header: 'Outstanding',
    cell: (info) => formatCurrencyMM(info.getValue()),
  }),
  col.accessor('dpd', {
    header: 'DPD',
    cell: (info) => formatNumber(info.getValue()),
  }),
  col.accessor('stage', { header: 'Stage' }),
  col.accessor('rating', {
    header: 'Rating',
    cell: (info) => formatRating(info.getValue()),
  }),
  col.accessor('ewsScore', {
    header: 'EWS',
    cell: (info) => {
      const score = info.getValue();
      const color =
        score >= 3 ? '#f44336' : score >= 2 ? '#ff9800' : '#4caf50';
      return (
        <span style={{ color, fontWeight: 700 }}>
          {formatRating(score)}
        </span>
      );
    },
  }),
  col.accessor('triggers', { header: 'Triggers' }),
  col.accessor('action', { header: 'Action' }),
];

interface Props {
  data: WatchlistAccount[];
}

export function WatchlistTable({ data }: Props) {
  return <PortfolioTable data={data} columns={columns} title="Watchlist Accounts" />;
}
