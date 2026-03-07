'use client';

import { useMemo } from 'react';
import { Box, Grid, Card, Typography, Stack, Chip } from '@mui/material';
import { LOSComparisonTable } from '@/components/tables/LOSComparisonTable';
import { LOSFunnelChart } from '@/components/charts/LOSFunnelChart';
import { MTDComparisonBar } from '@/components/charts/MTDComparisonBar';
import { DailyDisbursementTrend } from '@/components/charts/DailyDisbursementTrend';
import { ChartGridSkeleton } from '@/components/common/LoadingSkeleton';
import { useLOSMetrics, useLOSFunnel, useLOSDaily } from '@/hooks/useConsumerData';
import { formatCurrencyMM, formatPercent, formatNumber } from '@/lib/format';
import type { ScopeSelection, LOSComparisonMetric } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

interface OriginationKPI {
  label: string;
  value: string;
  achievement?: number;
  momPct?: number;
}

function OriginationKPIBanner({ kpis }: { kpis: OriginationKPI[] }) {
  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Stack
        direction="row"
        divider={<Box sx={{ width: '1px', bgcolor: 'divider', my: 1 }} />}
        sx={{ px: 1 }}
      >
        {kpis.map((k) => {
          const achColor =
            k.achievement == null
              ? undefined
              : k.achievement >= 0.45
                ? '#66bb6a'
                : k.achievement >= 0.35
                  ? '#ffa726'
                  : '#ef5350';

          return (
            <Box key={k.label} sx={{ flex: 1, py: 1.5, px: 1.5, textAlign: 'center' }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {k.label}
              </Typography>
              <Typography
                variant="h6"
                className="mono"
                sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}
              >
                {k.value}
              </Typography>
              <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                {k.achievement != null && (
                  <Chip
                    size="small"
                    label={`${formatPercent(k.achievement)} ach.`}
                    sx={{
                      height: 18,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: achColor ? `${achColor}18` : undefined,
                      color: achColor,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                )}
                {k.momPct != null && Math.abs(k.momPct) > 0.1 && (
                  <Chip
                    size="small"
                    label={`${k.momPct >= 0 ? '+' : ''}${k.momPct.toFixed(1)}%`}
                    sx={{
                      height: 18,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: k.momPct >= 0 ? 'rgba(102,187,106,0.12)' : 'rgba(239,83,80,0.12)',
                      color: k.momPct >= 0 ? '#66bb6a' : '#ef5350',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}

function extractKPIs(metrics: LOSComparisonMetric[]): OriginationKPI[] {
  const find = (name: string) => metrics.find((m) => m.metric.toLowerCase().includes(name.toLowerCase()));

  const logins = find('Login');
  const disbursed = find('Disburs');
  const approved = find('Approv');
  const tat = find('TAT');

  const kpis: OriginationKPI[] = [];

  if (logins) {
    kpis.push({
      label: 'Logins (MTD)',
      value: logins.mtd != null ? formatNumber(logins.mtd, 0) : '—',
      achievement: logins.achievement ?? undefined,
      momPct: logins.momChange ?? undefined,
    });
  }
  if (disbursed) {
    kpis.push({
      label: 'Disbursed (MTD)',
      value: disbursed.mtd != null ? formatCurrencyMM(disbursed.mtd) : '—',
      achievement: disbursed.achievement ?? undefined,
      momPct: disbursed.momChange ?? undefined,
    });
  }
  if (approved) {
    kpis.push({
      label: 'Approved (MTD)',
      value: approved.mtd != null ? formatNumber(approved.mtd, 0) : '—',
      achievement: approved.achievement ?? undefined,
      momPct: approved.momChange ?? undefined,
    });
  }
  if (tat) {
    kpis.push({
      label: 'Avg TAT (days)',
      value: tat.mtd != null ? tat.mtd.toFixed(1) : '—',
      momPct: tat.momChange != null ? -tat.momChange : undefined,
    });
  }

  return kpis;
}

export function ConsumerOriginationSection({ scope }: Props) {
  const { data: metrics, isLoading: l1 } = useLOSMetrics(scope);
  const { data: funnel, isLoading: l2 } = useLOSFunnel(undefined, scope);
  const { data: daily, isLoading: l3 } = useLOSDaily(scope);

  const kpis = useMemo(() => extractKPIs(metrics ?? []), [metrics]);

  if (l1 || l2 || l3) return <ChartGridSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <OriginationKPIBanner kpis={kpis} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <LOSFunnelChart data={funnel ?? []} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MTDComparisonBar data={metrics ?? []} />
        </Grid>
        <Grid item xs={12} md={3}>
          <DailyDisbursementTrend data={daily ?? []} />
        </Grid>
      </Grid>

      <LOSComparisonTable data={metrics ?? []} />
    </Box>
  );
}
