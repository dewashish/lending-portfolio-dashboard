'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { BusinessSupportTable } from '@/components/tables/BusinessSupportTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useApprovedBase, useRejectedBase } from '@/hooks/useConsumerData';
import { formatNumber, formatPercent } from '@/lib/format';
import type { ScopeSelection, ApprovedBaseRow, RejectedBaseRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

interface RiskKPI {
  label: string;
  value: string;
  color: string;
}

function RiskKPIStrip({ kpis }: { kpis: RiskKPI[] }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {kpis.map((k) => (
        <Card key={k.label} sx={{ flex: 1, p: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.3 }}
          >
            {k.label}
          </Typography>
          <Typography
            variant="h6"
            className="mono"
            sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
          >
            {k.value}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
}

function computeRiskKPIs(approved: ApprovedBaseRow[], rejected: RejectedBaseRow[]): RiskKPI[] {
  const kpis: RiskKPI[] = [];

  const totalApproved = approved.length;
  const totalRejected = rejected.length;
  const total = totalApproved + totalRejected;

  if (total > 0) {
    const approvalRate = totalApproved / total;
    kpis.push({
      label: 'Approval Rate',
      value: formatPercent(approvalRate),
      color: approvalRate >= 0.5 ? '#66bb6a' : approvalRate >= 0.35 ? '#ffa726' : '#ef5350',
    });
  }

  kpis.push({
    label: 'Approved Count',
    value: formatNumber(totalApproved, 0),
    color: '#42a5f5',
  });

  kpis.push({
    label: 'Rejected Count',
    value: formatNumber(totalRejected, 0),
    color: '#78909c',
  });

  // Total approved volume
  const totalApprovedVol = approved.reduce((sum, r) => sum + r.total, 0);
  if (totalApprovedVol > 0) {
    kpis.push({
      label: 'Approved Volume',
      value: formatNumber(totalApprovedVol, 0),
      color: '#42a5f5',
    });
  }

  return kpis;
}

export function ConsumerRiskAnalyticsSection({ scope }: Props) {
  const { data: approved, isLoading: l1 } = useApprovedBase(scope);
  const { data: rejected, isLoading: l2 } = useRejectedBase(scope);

  const kpis = useMemo(() => computeRiskKPIs(approved ?? [], rejected ?? []), [approved, rejected]);

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <RiskKPIStrip kpis={kpis} />}
      <BusinessSupportTable
        approvedData={approved ?? []}
        rejectedData={rejected ?? []}
      />
    </Box>
  );
}
