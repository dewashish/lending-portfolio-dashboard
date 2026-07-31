'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Box, Card, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Select, MenuItem,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useArcPerformance, useNpaCollection } from '@/hooks/useRiskData';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sort key for both quarterly (Q3'25) and monthly (Jun'26) period labels. */
function periodSortKey(p: string): number {
  const qm = p.match(/^Q(\d)'(\d{2})$/);
  if (qm) return 2000 + parseInt(qm[2], 10) + parseInt(qm[1], 10) / 10;
  const mm = p.match(/^([A-Za-z]{3})'(\d{2})$/);
  if (mm) {
    const mi = MONTHS.indexOf(mm[1]);
    return 2000 + parseInt(mm[2], 10) + (mi >= 0 ? mi / 12 : 0);
  }
  return 0;
}

const HDR = { fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' as const, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' as const };

interface Props {
  scope?: ScopeSelection;
}

export function ArcPerformanceSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: arcData, isLoading } = useArcPerformance(scope);
  const { data: npaData } = useNpaCollection(scope);
  const [period, setPeriod] = useState<string>('');

  const arcPeriods = useMemo(() => {
    const uniq = Array.from(new Set((arcData ?? []).map((r) => r.period)));
    return uniq.sort((a, b) => periodSortKey(a) - periodSortKey(b));
  }, [arcData]);

  // Default to latest period once data loads
  useEffect(() => {
    if (arcPeriods.length > 0 && !arcPeriods.includes(period)) {
      setPeriod(arcPeriods[arcPeriods.length - 1]);
    }
  }, [arcPeriods, period]);

  const prevPeriod = useMemo(() => {
    const idx = arcPeriods.indexOf(period);
    return idx > 0 ? arcPeriods[idx - 1] : null;
  }, [arcPeriods, period]);

  // Per-ARC rows for the selected period, with QoQ delta on current-month recoveries
  const arcRows = useMemo(() => {
    const rows = (arcData ?? []).filter((r) => r.period === period);
    return rows.map((r) => {
      const prev = prevPeriod
        ? (arcData ?? []).find((x) => x.arcName === r.arcName && x.period === prevPeriod)
        : undefined;
      const recoveryPct = r.originalPOS > 0 ? r.lifetimeRecoveries / r.originalPOS : 0;
      const qoq = prev && prev.currentMonthRecoveries !== 0
        ? ((r.currentMonthRecoveries - prev.currentMonthRecoveries) / Math.abs(prev.currentMonthRecoveries)) * 100
        : null;
      return { ...r, recoveryPct, qoq };
    });
  }, [arcData, period, prevPeriod]);

  const arcTotal = useMemo(() => arcRows.reduce((acc, r) => ({
    originalPOS: acc.originalPOS + r.originalPOS,
    currentPOS: acc.currentPOS + r.currentPOS,
    lifetimeRecoveries: acc.lifetimeRecoveries + r.lifetimeRecoveries,
    expectedRecoveriesAgreed: acc.expectedRecoveriesAgreed + r.expectedRecoveriesAgreed,
    currentMonthRecoveries: acc.currentMonthRecoveries + r.currentMonthRecoveries,
  }), { originalPOS: 0, currentPOS: 0, lifetimeRecoveries: 0, expectedRecoveriesAgreed: 0, currentMonthRecoveries: 0 }), [arcRows]);

  // NPA collection trend: pivot period → cells keyed by arc_type
  type NpaCell = { pos: number; collected: number; pct: number };
  const npaTrend = useMemo(() => {
    const byPeriod = new Map<string, Record<string, NpaCell>>();
    for (const r of npaData ?? []) {
      if (!byPeriod.has(r.period)) byPeriod.set(r.period, {});
      byPeriod.get(r.period)![r.arcType] = { pos: r.pos, collected: r.moneyCollected, pct: r.collectedToPosPct };
    }
    return Array.from(byPeriod.entries())
      .map(([period, cells]) => ({ period, cells }))
      .sort((a, b) => periodSortKey(a.period) - periodSortKey(b.period));
  }, [npaData]);

  if (isLoading) return <ChartSkeleton height={360} />;

  if ((arcData ?? []).length === 0) {
    return (
      <Card sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">No ARC performance data for the selected scope.</Typography>
      </Card>
    );
  }

  const deltaCell = (qoq: number | null) => {
    if (qoq == null) return <Box component="span" sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>—</Box>;
    const flat = Math.abs(qoq) < 0.5;
    const color = flat ? '#78909c' : qoq > 0 ? '#66bb6a' : '#ef5350';
    const Icon = flat ? TrendingFlatIcon : qoq > 0 ? TrendingUpIcon : TrendingDownIcon;
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, bgcolor: `${color}18`, borderRadius: 0.5, px: 0.5, py: 0.15 }}>
        <Icon sx={{ fontSize: 12, color }} />
        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, color }}>
          {formatPercent(Math.abs(qoq), 1)}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Per-ARC recovery table with period filter + QoQ delta */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            ARC Performance
          </Typography>
          <Select
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 120, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.4 } }}
          >
            {arcPeriods.map((p) => (
              <MenuItem key={p} value={p} sx={{ fontSize: '0.72rem' }}>{p}</MenuItem>
            ))}
          </Select>
        </Box>
        <TableContainer sx={{ maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={HDR}>ARC</TableCell>
                <TableCell align="right" sx={HDR}>Original POS</TableCell>
                <TableCell align="right" sx={HDR}>Current POS</TableCell>
                <TableCell align="right" sx={HDR}>Lifetime Recoveries</TableCell>
                <TableCell align="right" sx={HDR}>Expected (Agreed)</TableCell>
                <TableCell align="right" sx={HDR}>Recovery %</TableCell>
                <TableCell align="right" sx={HDR}>Current-Mo Recoveries</TableCell>
                <TableCell align="right" sx={HDR}>QoQ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {arcRows.map((r) => (
                <TableRow key={r.arcName} hover>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.arcName}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.originalPOS)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.currentPOS)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.lifetimeRecoveries)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.expectedRecoveriesAgreed)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatPercent(r.recoveryPct)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.currentMonthRecoveries)}</TableCell>
                  <TableCell align="right">{deltaCell(r.qoq)}</TableCell>
                </TableRow>
              ))}
              <TableRow hover sx={{ bgcolor: 'rgba(25,118,210,0.06)' }}>
                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(arcTotal.originalPOS)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(arcTotal.currentPOS)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(arcTotal.lifetimeRecoveries)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(arcTotal.expectedRecoveriesAgreed)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                  {formatPercent(arcTotal.originalPOS > 0 ? arcTotal.lifetimeRecoveries / arcTotal.originalPOS : 0)}
                </TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(arcTotal.currentMonthRecoveries)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* NPA Collection (ARC & Non-ARC) monthly trend */}
      {npaTrend.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5 }}>
            NPA Collection — ARC vs Non-ARC
          </Typography>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HDR}>Period</TableCell>
                  <TableCell align="right" sx={HDR}>ARC POS</TableCell>
                  <TableCell align="right" sx={HDR}>ARC Collected</TableCell>
                  <TableCell align="right" sx={HDR}>ARC %</TableCell>
                  <TableCell align="right" sx={HDR}>Non-ARC POS</TableCell>
                  <TableCell align="right" sx={HDR}>Non-ARC Collected</TableCell>
                  <TableCell align="right" sx={HDR}>Non-ARC %</TableCell>
                  <TableCell align="right" sx={HDR}>Total %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {npaTrend.map((r) => {
                  const arc = r.cells['ARC'];
                  const nonArc = r.cells['Non-ARC'];
                  const total = r.cells['Total'];
                  return (
                    <TableRow key={r.period} hover>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.period}</TableCell>
                      <TableCell align="right" sx={CELL}>{arc ? formatCurrency(arc.pos) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{arc ? formatCurrency(arc.collected) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{arc ? formatPercent(arc.pct) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{nonArc ? formatCurrency(nonArc.pos) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{nonArc ? formatCurrency(nonArc.collected) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{nonArc ? formatPercent(nonArc.pct) : '—'}</TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{total ? formatPercent(total.pct) : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
