'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { BusinessSupportTable } from '@/components/tables/BusinessSupportTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useApprovedBase, useRejectedBase } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatNumber, formatPercent } from '@/lib/format';
import type { ScopeSelection, ApprovedBaseRow, RejectedBaseRow, ConsumerFilters, ThresholdContext } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

interface RiskKPI {
  label: string;
  value: string;
  color: string;
  metricKey?: string;
  rawValue?: number;
}

function RiskKPIStrip({ kpis, ctx }: { kpis: RiskKPI[]; ctx?: ThresholdContext }) {
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
          {k.metricKey != null && k.rawValue != null ? (
            <BreachBadge metricKey={k.metricKey} value={k.rawValue} context={ctx}>
              <Typography
                variant="h6"
                className="mono"
                sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
              >
                {k.value}
              </Typography>
            </BreachBadge>
          ) : (
            <Typography
              variant="h6"
              className="mono"
              sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
            >
              {k.value}
            </Typography>
          )}
        </Card>
      ))}
    </Stack>
  );
}

function computeRiskKPIs(
  approved: ApprovedBaseRow[],
  rejected: RejectedBaseRow[],
  getColor: (metricKey: string, value: number, ctx?: ThresholdContext) => string,
  ctx?: ThresholdContext,
): RiskKPI[] {
  const kpis: RiskKPI[] = [];

  const totalApproved = approved.length;
  const totalRejected = rejected.length;
  const total = totalApproved + totalRejected;

  if (total > 0) {
    const approvalRate = totalApproved / total;
    kpis.push({
      label: 'Approval Rate',
      value: formatPercent(approvalRate),
      color: getColor('approval_rate', approvalRate, ctx),
      metricKey: 'approval_rate',
      rawValue: approvalRate,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConsumerRiskAnalyticsSection({ scope, filters }: Props) {
  const { data: approved, isLoading: l1 } = useApprovedBase(scope);
  const { data: rejected, isLoading: l2 } = useRejectedBase(scope);
  const { getColor } = useRiskAppetite();
  const ctx = useMemo(() => buildThresholdContext(scope, {
    businessLine: 'consumer_finance',
    product: filters?.products?.length === 1 ? filters.products[0] : undefined,
  }), [scope, filters?.products]);

  const kpis = useMemo(() => computeRiskKPIs(approved ?? [], rejected ?? [], getColor, ctx), [approved, rejected, getColor, ctx]);

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <RiskKPIStrip kpis={kpis} ctx={ctx} />}
      <BusinessSupportTable
        approvedData={approved ?? []}
        rejectedData={rejected ?? []}
      />
    </Box>
  );
}
