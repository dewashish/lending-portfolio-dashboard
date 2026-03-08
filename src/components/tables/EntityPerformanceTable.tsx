'use client';

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Chip } from '@mui/material';
import { PortfolioTable } from '@/components/tables/PortfolioTable';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { EntityPerformance, RAGStatus } from '@/lib/types';

const RAG_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

const col = createColumnHelper<EntityPerformance>();

interface Props {
  data: EntityPerformance[];
}

export function EntityPerformanceTable({ data }: Props) {
  const { formatCurrencyMM } = useCurrencyFormat();

  const columns = useMemo(() => [
    col.accessor('entity', { header: 'Entity' }),
    col.accessor('geography', { header: 'Geography' }),
    col.accessor('approvedLimit', {
      header: 'Limit',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('outstanding', {
      header: 'Outstanding',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('utilization', {
      header: 'Utilization %',
      cell: (info) => formatPercent(info.getValue()),
    }),
    col.accessor('stage1', {
      header: 'Stage 1',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('stage2', {
      header: 'Stage 2',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('stage3', {
      header: 'Stage 3',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('provisions', {
      header: 'Provisions',
      cell: (info) => formatCurrencyMM(info.getValue()),
    }),
    col.accessor('provisionCoverage', {
      header: 'Coverage',
      cell: (info) => formatPercent(info.getValue()),
    }),
    col.accessor('ragStatus', {
      header: 'RAG',
      cell: (info) => {
        const rag = info.getValue();
        return (
          <Chip
            label={rag}
            size="small"
            sx={{
              bgcolor: RAG_COLORS[rag],
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.65rem',
              height: 22,
            }}
          />
        );
      },
    }),
  ], [formatCurrencyMM]);

  return <PortfolioTable data={data} columns={columns} title="Entity Performance" />;
}
