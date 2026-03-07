'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { PortfolioTable } from '@/components/tables/PortfolioTable';
import { formatCurrencyMM, formatPercent, formatNumber, formatRating } from '@/lib/format';
import type { ProductMixRow } from '@/lib/types';

const col = createColumnHelper<ProductMixRow>();

const columns = [
  col.accessor('productType', { header: 'Product' }),
  col.accessor('facilities', {
    header: 'Facilities',
    cell: (info) => formatNumber(info.getValue()),
  }),
  col.accessor('limit', {
    header: 'Limit',
    cell: (info) => formatCurrencyMM(info.getValue()),
  }),
  col.accessor('outstanding', {
    header: 'Outstanding',
    cell: (info) => formatCurrencyMM(info.getValue()),
  }),
  col.accessor('portfolioShare', {
    header: 'Share %',
    cell: (info) => formatPercent(info.getValue()),
  }),
  col.accessor('avgTenor', {
    header: 'Avg Tenor',
    cell: (info) => formatNumber(info.getValue()),
  }),
  col.accessor('utilization', {
    header: 'Utilization %',
    cell: (info) => formatPercent(info.getValue()),
  }),
  col.accessor('stage2Plus3', {
    header: 'Stage 2+3 %',
    cell: (info) => formatPercent(info.getValue()),
  }),
  col.accessor('avgRating', {
    header: 'Rating',
    cell: (info) => formatRating(info.getValue()),
  }),
  col.accessor('watchlistCount', {
    header: 'Watchlist',
    cell: (info) => formatNumber(info.getValue()),
  }),
];

interface Props {
  data: ProductMixRow[];
}

export function ProductMixTable({ data }: Props) {
  return <PortfolioTable data={data} columns={columns} title="Product Mix" />;
}
