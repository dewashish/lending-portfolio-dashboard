'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { PortfolioTable } from '@/components/tables/PortfolioTable';
import { formatCurrencyMM } from '@/lib/format';
import type { EWSFacilityAlert } from '@/lib/types';

const col = createColumnHelper<EWSFacilityAlert>();

const columns = [
  col.accessor('facilityRef', { header: 'Facility' }),
  col.accessor('entity', { header: 'Entity' }),
  col.accessor('obligor', { header: 'Obligor' }),
  col.accessor('ewsScore', {
    header: 'EWS Score',
    cell: (info) => {
      const score = info.getValue();
      const color =
        score >= 4 ? '#f44336' : score >= 3 ? '#ff5722' : score >= 2 ? '#ff9800' : '#4caf50';
      return (
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            backgroundColor: color,
            padding: '2px 8px',
            borderRadius: 4,
            display: 'inline-block',
          }}
        >
          {score.toFixed(1)}
        </span>
      );
    },
  }),
  col.accessor('outstanding', {
    header: 'Outstanding',
    cell: (info) => formatCurrencyMM(info.getValue()),
  }),
  col.accessor('triggers', { header: 'Triggers' }),
  col.accessor('stage', { header: 'Stage' }),
  col.accessor('action', { header: 'Action' }),
];

interface Props {
  data: EWSFacilityAlert[];
}

export function EWSAlertTable({ data }: Props) {
  return <PortfolioTable data={data} columns={columns} title="EWS Facility Alerts" />;
}
