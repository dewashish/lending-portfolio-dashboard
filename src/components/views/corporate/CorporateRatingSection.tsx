'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Grid,
  Chip,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { RatingDistributionBar } from '@/components/charts/RatingDistributionBar';
import { RatingMigrationMatrix } from '@/components/charts/corporate/RatingMigrationMatrix';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import {
  useCorporateRatingAnalysis,
  useCorporateRatingMigration,
} from '@/hooks/useCorporateData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, RatingDistribution, CorporateRatingAnalysisRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

// ── Styling constants (match CorporateOverview) ─────────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const HDR_BG = 'rgba(0,0,0,0.03)';

const RATING_BANDS = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B', 'C/D', 'Unrated',
];

// ── Helpers ─────────────────────────────────────────────────────
function sortPeriods(periods: string[]): string[] {
  const monthOrder: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  return [...periods].sort((a, b) => {
    const [mA, yA] = [a.slice(0, 3), a.replace(/[^0-9]/g, '')];
    const [mB, yB] = [b.slice(0, 3), b.replace(/[^0-9]/g, '')];
    if (yA !== yB) return +yA - +yB;
    return (monthOrder[mA] ?? 0) - (monthOrder[mB] ?? 0);
  });
}

function computeNotches(priorRating: string, currentRating: string): number {
  const priorIdx = RATING_BANDS.indexOf(priorRating);
  const currentIdx = RATING_BANDS.indexOf(currentRating);
  if (priorIdx === -1 || currentIdx === -1) return 0;
  return Math.abs(priorIdx - currentIdx);
}

function directionChip(direction: string) {
  const lower = direction.toLowerCase();
  if (lower === 'upgrade') {
    return (
      <Chip
        icon={<ArrowUpwardIcon sx={{ fontSize: 12 }} />}
        label={direction}
        size="small"
        sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(76,175,80,0.15)', color: '#4caf50', fontWeight: 600 }}
      />
    );
  }
  if (lower === 'downgrade') {
    return (
      <Chip
        icon={<ArrowDownwardIcon sx={{ fontSize: 12 }} />}
        label={direction}
        size="small"
        sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(244,67,54,0.15)', color: '#f44336', fontWeight: 600 }}
      />
    );
  }
  return (
    <Chip
      icon={<RemoveIcon sx={{ fontSize: 12 }} />}
      label={direction}
      size="small"
      sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(120,144,156,0.15)', color: '#78909c', fontWeight: 600 }}
    />
  );
}

// ── Rating Pivot Table sub-component ────────────────────────────
function RatingPivotTable({
  data,
  valueField,
  selectedPeriods,
  formatCurrency,
}: {
  data: CorporateRatingAnalysisRow[];
  valueField: 'disbursement' | 'pos';
  selectedPeriods: string[];
  formatCurrency: (v: number) => string;
}) {
  const grid = useMemo(() => {
    const g = new Map<string, Map<string, { value: number; share: number; facilities: number }>>();
    const pTotals = new Map<string, number>();

    // Compute period totals first
    data.forEach((r) => {
      if (!selectedPeriods.includes(r.period)) return;
      pTotals.set(r.period, (pTotals.get(r.period) ?? 0) + r[valueField]);
    });

    data.forEach((r) => {
      if (!selectedPeriods.includes(r.period)) return;
      if (!g.has(r.ratingBand)) g.set(r.ratingBand, new Map());
      const periodTotal = pTotals.get(r.period) ?? 1;
      g.get(r.ratingBand)!.set(r.period, {
        value: r[valueField],
        share: periodTotal > 0 ? r[valueField] / periodTotal : 0,
        facilities: r.facilityCount,
      });
    });
    return g;
  }, [data, valueField, selectedPeriods]);

  // Compute totals per period
  const periodTotals = useMemo(() => {
    const t = new Map<string, { value: number; facilities: number }>();
    selectedPeriods.forEach((p) => t.set(p, { value: 0, facilities: 0 }));
    grid.forEach((periodMap) => {
      periodMap.forEach((cell, period) => {
        const prev = t.get(period);
        if (prev) t.set(period, { value: prev.value + cell.value, facilities: prev.facilities + cell.facilities });
      });
    });
    return t;
  }, [grid, selectedPeriods]);

  // Get rating bands present in data, in order
  const bands = RATING_BANDS.filter((b) => grid.has(b));

  if (bands.length === 0) {
    return <Typography variant="caption" color="text.secondary">No data available</Typography>;
  }

  return (
    <TableContainer sx={{ maxHeight: 480 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          {/* Period header row */}
          <TableRow>
            <TableCell sx={{ ...HDR, borderBottom: 'none' }} rowSpan={2}>Rating Band</TableCell>
            {selectedPeriods.map((p) => (
              <TableCell key={p} align="center" colSpan={3} sx={{ ...HDR, borderBottom: 'none' }}>{p}</TableCell>
            ))}
          </TableRow>
          {/* Sub-column header row */}
          <TableRow>
            {selectedPeriods.flatMap((p) => [
              <TableCell key={`${p}-amt`} align="right" sx={HDR}>Amount</TableCell>,
              <TableCell key={`${p}-pct`} align="right" sx={HDR}>% Total</TableCell>,
              <TableCell key={`${p}-fac`} align="right" sx={HDR}>Facilities</TableCell>,
            ])}
          </TableRow>
        </TableHead>
        <TableBody>
          {bands.map((band) => (
            <TableRow key={band} hover>
              <TableCell sx={CELL_TEXT}>{band}</TableCell>
              {selectedPeriods.flatMap((p) => {
                const cell = grid.get(band)?.get(p);
                return [
                  <TableCell key={`${p}-amt`} align="right" sx={CELL}>{cell ? formatCurrency(cell.value) : '—'}</TableCell>,
                  <TableCell key={`${p}-pct`} align="right" sx={CELL}>{cell ? formatPercent(cell.share) : '—'}</TableCell>,
                  <TableCell key={`${p}-fac`} align="right" sx={CELL}>{cell ? formatNumber(cell.facilities) : '—'}</TableCell>,
                ];
              })}
            </TableRow>
          ))}
          {/* Total row */}
          <TableRow sx={{ bgcolor: HDR_BG }}>
            <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
            {selectedPeriods.flatMap((p) => {
              const total = periodTotals.get(p);
              return [
                <TableCell key={`${p}-amt`} align="right" sx={{ ...CELL, fontWeight: 700 }}>{total ? formatCurrency(total.value) : '—'}</TableCell>,
                <TableCell key={`${p}-pct`} align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>,
                <TableCell key={`${p}-fac`} align="right" sx={{ ...CELL, fontWeight: 700 }}>{total ? formatNumber(total.facilities) : '—'}</TableCell>,
              ];
            })}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function CorporateRatingSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: ratingData, isLoading: loadingRating } = useCorporateRatingAnalysis(scope);
  const { data: migrationData, isLoading: loadingMigration } = useCorporateRatingMigration(scope);

  // ── State ──
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  // ── Derived periods ──
  const allPeriods = useMemo(() => {
    if (!ratingData?.length) return [];
    const pSet = new Set(ratingData.map((r) => r.period));
    return sortPeriods(Array.from(pSet));
  }, [ratingData]);

  useEffect(() => {
    if (allPeriods.length > 0 && selectedPeriods.length === 0) {
      setSelectedPeriods(allPeriods.slice(-3));
    }
  }, [allPeriods, selectedPeriods.length]);

  const visiblePeriods = useMemo(
    () => allPeriods.filter((p) => selectedPeriods.includes(p)),
    [allPeriods, selectedPeriods],
  );

  // ── KPI Items (from migration data) ──
  const kpiItems = useMemo((): KPIItem[] => {
    const rows = migrationData ?? [];
    const upgrades = rows.filter((r) => r.migrationDirection.toLowerCase() === 'upgrade');
    const downgrades = rows.filter((r) => r.migrationDirection.toLowerCase() === 'downgrade');
    const net = upgrades.length - downgrades.length;
    const watchToNpa = rows.filter(
      (r) => ['C/D', 'Unrated'].includes(r.currentRating) && !['C/D', 'Unrated'].includes(r.priorRating),
    ).length;

    return [
      {
        label: 'Total Upgrades (Month)',
        value: String(upgrades.length),
        color: '#4caf50',
        subtitle: 'Borrowers upgraded this month',
      },
      {
        label: 'Total Downgrades (Month)',
        value: String(downgrades.length),
        color: '#f44336',
        subtitle: 'Borrowers downgraded this month',
      },
      {
        label: 'Net Rating Movement',
        value: `${net >= 0 ? '+' : ''}${net}`,
        color: net >= 0 ? '#66bb6a' : '#ef5350',
        subtitle: 'Net change in portfolio score',
      },
      {
        label: 'Watch \u2192 NPA Migrations',
        value: String(watchToNpa),
        color: watchToNpa > 0 ? '#ff9800' : '#78909c',
        subtitle: 'Accounts moved to NPA this month',
      },
    ];
  }, [migrationData]);

  // ── Bar chart data (latest visible period) ──
  const latestPeriod = visiblePeriods[visiblePeriods.length - 1] ?? '';
  const barData: RatingDistribution[] = useMemo(() => {
    return (ratingData ?? [])
      .filter((r) => r.period === latestPeriod)
      .map((r) => ({
        ratingBand: r.ratingBand,
        count: r.facilityCount,
        balance: r.pos,
        portfolioShare: r.portfolioShare,
        avgProvision: 0,
      }));
  }, [ratingData, latestPeriod]);

  // ── YTD Migration Summary by Sector ──
  const sectorSummary = useMemo(() => {
    const rows = migrationData ?? [];
    const sectors = new Map<string, { upgrades: number; downgrades: number }>();
    rows.forEach((r) => {
      if (!sectors.has(r.sector)) sectors.set(r.sector, { upgrades: 0, downgrades: 0 });
      const entry = sectors.get(r.sector)!;
      if (r.migrationDirection.toLowerCase() === 'upgrade') entry.upgrades++;
      else if (r.migrationDirection.toLowerCase() === 'downgrade') entry.downgrades++;
    });
    return Array.from(sectors.entries())
      .map(([sector, counts]) => ({
        sector,
        upgrades: counts.upgrades,
        downgrades: counts.downgrades,
        net: counts.upgrades - counts.downgrades,
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [migrationData]);

  // ── Period toggle helpers ──
  const togglePeriod = (p: string) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : sortPeriods([...prev, p]),
    );
  };

  const setPeriodPreset = (n: number) => {
    if (n === -1) setSelectedPeriods([...allPeriods]);
    else setSelectedPeriods(allPeriods.slice(-n));
  };

  // ── Loading ──
  if (loadingRating || loadingMigration) return <LoadingSkeleton />;

  const ratingRows = ratingData ?? [];
  const migrationRows = migrationData ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ═══════ GROUP A: Period Filter + KPI Strip ═══════ */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mr: 1 }}>
            Period
          </Typography>
          {[
            { label: 'Last 3', value: 3 },
            { label: 'Last 6', value: 6 },
            { label: 'All', value: -1 },
          ].map(({ label, value }) => (
            <Chip
              key={label}
              label={label}
              size="small"
              variant={
                (value === -1 && selectedPeriods.length === allPeriods.length) ||
                (value !== -1 && selectedPeriods.length === value && selectedPeriods.join() === allPeriods.slice(-value).join())
                  ? 'filled' : 'outlined'
              }
              color={
                (value === -1 && selectedPeriods.length === allPeriods.length) ||
                (value !== -1 && selectedPeriods.length === value && selectedPeriods.join() === allPeriods.slice(-value).join())
                  ? 'primary' : 'default'
              }
              onClick={() => setPeriodPreset(value)}
              sx={{ fontWeight: 600, fontSize: '0.68rem' }}
            />
          ))}
          <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {allPeriods.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                variant={selectedPeriods.includes(p) ? 'filled' : 'outlined'}
                color={selectedPeriods.includes(p) ? 'primary' : 'default'}
                onClick={() => togglePeriod(p)}
                sx={{ fontSize: '0.65rem' }}
              />
            ))}
          </Box>
        </Box>

        {kpiItems.length > 0 && <KPIRow items={kpiItems} />}
      </Card>

      {/* ═══════ GROUP B: Rating Distribution Chart ═══════ */}
      <RatingDistributionBar data={barData} period={latestPeriod} />

      {/* ═══════ GROUP C: Two Pivot Tables ═══════ */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
              Value of Disbursement
            </Typography>
            <RatingPivotTable
              data={ratingRows}
              valueField="disbursement"
              selectedPeriods={visiblePeriods}
              formatCurrency={formatCurrency}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
              Current Principal O/s
            </Typography>
            <RatingPivotTable
              data={ratingRows}
              valueField="pos"
              selectedPeriods={visiblePeriods}
              formatCurrency={formatCurrency}
            />
          </Card>
        </Grid>
      </Grid>

      {/* ═══════ GROUP D: Borrower-Level Rating Change Detail ═══════ */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
          Borrower-Level Rating Change Detail
        </Typography>
        {migrationRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No migration data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HDR}>Borrower Name</TableCell>
                  <TableCell sx={HDR}>Sector</TableCell>
                  <TableCell sx={HDR}>Previous Rating</TableCell>
                  <TableCell sx={HDR}>New Rating</TableCell>
                  <TableCell align="center" sx={HDR}>Notches</TableCell>
                  <TableCell sx={HDR}>Movement</TableCell>
                  <TableCell align="right" sx={HDR}>Exposure</TableCell>
                  <TableCell sx={HDR}>Key Trigger</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {migrationRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.customerName}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                    <TableCell sx={CELL}>{row.priorRating}</TableCell>
                    <TableCell sx={{ ...CELL, color: row.migrationDirection.toLowerCase() === 'upgrade' ? '#4caf50' : row.migrationDirection.toLowerCase() === 'downgrade' ? '#f44336' : undefined }}>
                      {row.currentRating}
                    </TableCell>
                    <TableCell align="center" sx={CELL}>
                      {computeNotches(row.priorRating, row.currentRating)}
                    </TableCell>
                    <TableCell>{directionChip(row.migrationDirection)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.exposure)}</TableCell>
                    <TableCell sx={{ ...CELL_TEXT, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.triggerReason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* ═══════ GROUP E: Sector Summary + Migration Matrix ═══════ */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
              YTD Migration Summary by Sector
            </Typography>
            {sectorSummary.length === 0 ? (
              <Typography variant="caption" color="text.secondary">No sector migration data</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HDR}>Sector</TableCell>
                      <TableCell align="right" sx={HDR}>Upgrades</TableCell>
                      <TableCell align="right" sx={HDR}>Downgrades</TableCell>
                      <TableCell align="right" sx={HDR}>Net</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sectorSummary.map((row) => (
                      <TableRow key={row.sector} hover>
                        <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                        <TableCell align="right" sx={{ ...CELL, color: '#4caf50' }}>{row.upgrades}</TableCell>
                        <TableCell align="right" sx={{ ...CELL, color: '#f44336' }}>{row.downgrades}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            ...CELL,
                            fontWeight: 700,
                            color: row.net > 0 ? '#4caf50' : row.net < 0 ? '#f44336' : '#78909c',
                          }}
                        >
                          {row.net > 0 ? `+${row.net}` : String(row.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow sx={{ bgcolor: HDR_BG }}>
                      <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700, color: '#4caf50' }}>
                        {sectorSummary.reduce((s, r) => s + r.upgrades, 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700, color: '#f44336' }}>
                        {sectorSummary.reduce((s, r) => s + r.downgrades, 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {(() => {
                          const total = sectorSummary.reduce((s, r) => s + r.net, 0);
                          return total > 0 ? `+${total}` : String(total);
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <RatingMigrationMatrix data={migrationRows} />
        </Grid>
      </Grid>
    </Box>
  );
}
