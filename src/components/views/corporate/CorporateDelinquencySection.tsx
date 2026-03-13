'use client';

import { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { PARTrendLineChart } from '@/components/charts/corporate/PARTrendLineChart';
import { DelinquencyBucketDonut } from '@/components/charts/corporate/DelinquencyBucketDonut';
import { useCorporateDelinquency, useCorporatePARTrend } from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, CorporateDelinquencyRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

// ── Styling constants ────────────────────────────────────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const HDR_BG = 'rgba(0,0,0,0.03)';

// ── Color constants ──────────────────────────────────────────────
const PAR_COLORS: Record<string, string> = {
  'X+': '#42a5f5',
  '30+': '#ff9800',
  '60+': '#f44336',
  '90+': '#b71c1c',
};

const DPD_BUCKET_COLORS: Record<string, string> = {
  'Current': '#4caf50',
  '1-30 DPD': '#ff9800',
  '31-60 DPD': '#f44336',
  '61-90 DPD': '#d32f2f',
  '90+ DPD': '#b71c1c',
};

const STATUS_COLORS: Record<string, string> = {
  'Overdue': '#ff9800',
  'Under Collection': '#42a5f5',
  'Restructured': '#78909c',
  'Legal Action': '#f44336',
  'NPA': '#b71c1c',
};

// ── Rating bands for downgrade comparison ────────────────────────
const RATING_BANDS = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC', 'CC', 'C', 'D', 'Unrated',
];

// ── Helpers ──────────────────────────────────────────────────────
function getDPDBucket(dpd: number): string {
  if (dpd === 0) return 'Current';
  if (dpd <= 30) return '1-30 DPD';
  if (dpd <= 60) return '31-60 DPD';
  if (dpd <= 90) return '61-90 DPD';
  return '90+ DPD';
}

function dpdColor(dpd: number): string | undefined {
  if (dpd > 90) return '#b71c1c';
  if (dpd > 30) return '#ff9800';
  if (dpd > 0) return '#4caf50';
  return undefined;
}

function statusChip(status: string) {
  const color = STATUS_COLORS[status] ?? '#78909c';
  return (
    <Chip
      label={status}
      size="small"
      sx={{ fontSize: '0.65rem', height: 20, bgcolor: `${color}26`, color, fontWeight: 600 }}
    />
  );
}

function bucketChip(bucket: string) {
  const color = DPD_BUCKET_COLORS[bucket] ?? '#78909c';
  return (
    <Chip
      label={bucket}
      size="small"
      sx={{ fontSize: '0.6rem', height: 18, bgcolor: `${color}1A`, color, fontWeight: 600 }}
    />
  );
}

function isDowngraded(ratingAtDisb: string, currentRating: string): boolean {
  const disbIdx = RATING_BANDS.indexOf(ratingAtDisb);
  const curIdx = RATING_BANDS.indexOf(currentRating);
  return disbIdx >= 0 && curIdx >= 0 && curIdx > disbIdx;
}

// ── Analysis sub-table: aggregated by a key ──────────────────────
interface AggRow {
  key: string;
  sanctioned: number;
  disbursed: number;
  pos: number;
  securityCover: number;
  securityWeight: number;
  ratingAtDisb: string;
  currentRating: string;
  downgraded: boolean;
  count: number;
}

function aggregateRows(
  rows: CorporateDelinquencyRow[],
  groupBy: keyof CorporateDelinquencyRow,
  isIndividual: boolean,
): AggRow[] {
  if (isIndividual) {
    return rows.map((r) => ({
      key: String(r[groupBy]),
      sanctioned: r.sanctionedLimit,
      disbursed: r.disbursedAmount,
      pos: r.currentPOS,
      securityCover: r.securityCover,
      securityWeight: r.currentPOS,
      ratingAtDisb: r.ratingAtDisbursement,
      currentRating: r.currentRating,
      downgraded: isDowngraded(r.ratingAtDisbursement, r.currentRating),
      count: 1,
    }));
  }
  // Aggregate
  const map = new Map<string, AggRow>();
  rows.forEach((r) => {
    const k = String(r[groupBy]) || 'Unknown';
    const prev = map.get(k);
    if (prev) {
      prev.sanctioned += r.sanctionedLimit;
      prev.disbursed += r.disbursedAmount;
      prev.pos += r.currentPOS;
      prev.securityCover += r.securityCover * r.currentPOS;
      prev.securityWeight += r.currentPOS;
      prev.count += 1;
    } else {
      map.set(k, {
        key: k,
        sanctioned: r.sanctionedLimit,
        disbursed: r.disbursedAmount,
        pos: r.currentPOS,
        securityCover: r.securityCover * r.currentPOS,
        securityWeight: r.currentPOS,
        ratingAtDisb: '',
        currentRating: '',
        downgraded: false,
        count: 1,
      });
    }
  });
  const result: AggRow[] = [];
  map.forEach((v) => {
    v.securityCover = v.securityWeight > 0 ? v.securityCover / v.securityWeight : 0;
    result.push(v);
  });
  return result.sort((a, b) => b.pos - a.pos);
}

// ── Main Component ──────────────────────────────────────────────
export function CorporateDelinquencySection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: delinquency, isLoading: loadingDelinq } = useCorporateDelinquency(scope);
  const { data: parTrend, isLoading: loadingPAR } = useCorporatePARTrend(scope);

  // ── State ──
  const [dpdBucketFilter, setDpdBucketFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [analysisTab, setAnalysisTab] = useState(0);
  const [borrowerLimit, setBorrowerLimit] = useState<number>(20);

  const rows = useMemo(() => delinquency ?? [], [delinquency]);
  const parTrendData = useMemo(() => parTrend ?? [], [parTrend]);

  // ── KPI computation ──
  const totalPOS = useMemo(() => rows.reduce((s, r) => s + r.currentPOS, 0), [rows]);

  const kpiItems = useMemo((): KPIItem[] => {
    const delinqPOS = rows.filter((r) => r.currentDPD > 0).reduce((s, r) => s + r.currentPOS, 0);
    const par30POS = rows.filter((r) => r.currentDPD > 30).reduce((s, r) => s + r.currentPOS, 0);
    const par90POS = rows.filter((r) => r.currentDPD > 90).reduce((s, r) => s + r.currentPOS, 0);

    const parXRate = totalPOS > 0 ? delinqPOS / totalPOS : 0;
    const par30Rate = totalPOS > 0 ? par30POS / totalPOS : 0;
    const par90Rate = totalPOS > 0 ? par90POS / totalPOS : 0;

    return [
      {
        label: 'PAR X+ Rate',
        value: formatPercent(parXRate),
        color: '#42a5f5',
        subtitle: 'Portfolio at risk (all delinquent)',
        info: 'Exposure-weighted: delinquent POS (DPD > 0) / total POS',
      },
      {
        label: 'PAR 30+ Rate',
        value: formatPercent(par30Rate),
        color: '#ff9800',
        subtitle: 'Past due 30+ days',
        info: 'Exposure-weighted: POS with DPD > 30 / total POS',
      },
      {
        label: 'PAR 90+ (NPA)',
        value: formatPercent(par90Rate),
        color: '#b71c1c',
        subtitle: 'Non-performing assets',
        info: 'Exposure-weighted: POS with DPD > 90 / total POS',
      },
      {
        label: 'Total Delinquent POS',
        value: formatCurrency(delinqPOS),
        color: '#1565c0',
        subtitle: 'Total delinquent exposure',
      },
    ];
  }, [rows, totalPOS, formatCurrency]);

  // ── DPD Bucket donut data ──
  const bucketDonutData = useMemo(() => {
    const map = new Map<string, { exposure: number; count: number }>();
    rows.forEach((r) => {
      const bucket = getDPDBucket(r.currentDPD);
      const prev = map.get(bucket) ?? { exposure: 0, count: 0 };
      map.set(bucket, { exposure: prev.exposure + r.currentPOS, count: prev.count + 1 });
    });
    const result: { bucket: string; exposure: number; count: number }[] = [];
    map.forEach((v, k) => result.push({ bucket: k, ...v }));
    // Sort by severity
    const order = ['Current', '1-30 DPD', '31-60 DPD', '61-90 DPD', '90+ DPD'];
    return result.sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));
  }, [rows]);

  // ── PAR Summary table data (period × bucket) ──
  const parSummary = useMemo(() => {
    if (parTrendData.length === 0) return { periods: [] as string[], buckets: [] as string[], rateMap: new Map<string, number>() };
    const periodSet = new Set<string>();
    const bucketSet = new Set<string>();
    const rateMap = new Map<string, number>();
    parTrendData.forEach((r) => {
      periodSet.add(r.period);
      bucketSet.add(r.dpdBucket);
      rateMap.set(`${r.dpdBucket}|${r.period}`, r.parRate);
    });
    // Sort periods chronologically
    const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const periods = Array.from(periodSet).sort((a, b) => {
      const [mA, yA] = [a.slice(0, 3), a.slice(4)];
      const [mB, yB] = [b.slice(0, 3), b.slice(4)];
      const numA = (parseInt(yA) || 0) * 12 + MONTH_ORDER.indexOf(mA);
      const numB = (parseInt(yB) || 0) * 12 + MONTH_ORDER.indexOf(mB);
      return numA - numB;
    });
    const buckets = ['X+', '30+', '60+', '90+'].filter((b) => bucketSet.has(b));
    return { periods, buckets, rateMap };
  }, [parTrendData]);

  // ── Analysis tab data ──
  const analysisThresholds = [30, 60, 90];
  const analysisTopN = [20, 5, 5];

  // ── Filtered rows for detail table ──
  const filteredRows = useMemo(() => {
    let result = rows;
    if (dpdBucketFilter) {
      const ranges: Record<string, [number, number]> = {
        '1-30 DPD': [1, 30],
        '31-60 DPD': [31, 60],
        '61-90 DPD': [61, 90],
        '90+ DPD': [91, Infinity],
      };
      const range = ranges[dpdBucketFilter];
      if (range) result = result.filter((r) => r.currentDPD >= range[0] && r.currentDPD <= range[1]);
    }
    if (statusFilter) result = result.filter((r) => r.currentStatus === statusFilter);
    return result;
  }, [rows, dpdBucketFilter, statusFilter]);

  const displayedRows = borrowerLimit === -1 ? filteredRows : filteredRows.slice(0, borrowerLimit);

  // ── Toggle helpers ──
  const toggleBucket = (b: string) => setDpdBucketFilter((prev) => (prev === b ? null : b));
  const toggleStatus = (s: string) => setStatusFilter((prev) => (prev === s ? null : s));

  // ── Render analysis sub-table ──
  function renderSubTable(
    title: string,
    aggRows: AggRow[],
    totalFilteredPOS: number,
    isIndividual: boolean,
  ) {
    const totalRow: AggRow = {
      key: 'Total',
      sanctioned: aggRows.reduce((s, r) => s + r.sanctioned, 0),
      disbursed: aggRows.reduce((s, r) => s + r.disbursed, 0),
      pos: aggRows.reduce((s, r) => s + r.pos, 0),
      securityCover: aggRows.length > 0
        ? aggRows.reduce((s, r) => s + r.securityCover * r.pos, 0) / aggRows.reduce((s, r) => s + r.pos, 0) || 0
        : 0,
      securityWeight: 0,
      ratingAtDisb: '',
      currentRating: '',
      downgraded: false,
      count: aggRows.reduce((s, r) => s + r.count, 0),
    };

    return (
      <Card variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', mb: 1, display: 'block' }}>
          {title}
        </Typography>
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...HDR, bgcolor: HDR_BG }}>Name</TableCell>
                <TableCell align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>Sanctioned</TableCell>
                <TableCell align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>Disbursed</TableCell>
                <TableCell align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>POS</TableCell>
                <TableCell align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>% of POS</TableCell>
                <TableCell align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>Sec. Cover</TableCell>
                {isIndividual && (
                  <>
                    <TableCell sx={{ ...HDR, bgcolor: HDR_BG }}>Rtg at Disb.</TableCell>
                    <TableCell sx={{ ...HDR, bgcolor: HDR_BG }}>Current Rtg</TableCell>
                    <TableCell sx={{ ...HDR, bgcolor: HDR_BG }}>Downgrade</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {aggRows.map((r, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={CELL_TEXT}>{r.key}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.sanctioned)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.disbursed)}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(r.pos)}</TableCell>
                  <TableCell align="right" sx={CELL}>
                    {totalFilteredPOS > 0 ? formatPercent(r.pos / totalFilteredPOS) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={CELL}>{r.securityCover.toFixed(2)}x</TableCell>
                  {isIndividual && (
                    <>
                      <TableCell sx={CELL}>{r.ratingAtDisb}</TableCell>
                      <TableCell sx={{ ...CELL, color: r.downgraded ? '#f44336' : undefined, fontWeight: r.downgraded ? 700 : undefined }}>
                        {r.currentRating}
                      </TableCell>
                      <TableCell sx={CELL}>
                        {r.downgraded ? (
                          <Chip label="Yes" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#f4433620', color: '#f44336', fontWeight: 600 }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>No</Typography>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow sx={{ bgcolor: '#fff9c4' }}>
                <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalRow.sanctioned)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalRow.disbursed)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalRow.pos)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                  {totalFilteredPOS > 0 ? formatPercent(totalRow.pos / totalFilteredPOS) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{totalRow.securityCover.toFixed(2)}x</TableCell>
                {isIndividual && (
                  <>
                    <TableCell sx={CELL} />
                    <TableCell sx={CELL} />
                    <TableCell sx={CELL} />
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  }

  // ── Render analysis panel for a given DPD threshold ──
  function renderAnalysisPanel(tabIdx: number) {
    const threshold = analysisThresholds[tabIdx];
    const topN = analysisTopN[tabIdx];
    const filtered = rows.filter((r) => r.currentDPD > threshold);
    const filteredPOS = filtered.reduce((s, r) => s + r.currentPOS, 0);

    if (filtered.length === 0) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
          No borrowers with DPD &gt; {threshold}
        </Typography>
      );
    }

    // Top N borrowers (individual rows)
    const topBorrowers = aggregateRows(
      filtered.sort((a, b) => b.currentPOS - a.currentPOS).slice(0, topN),
      'customerName',
      true,
    );
    const sectorConc = aggregateRows(filtered, 'sector', false);
    const ratingDist = aggregateRows(filtered, 'currentRating', false);
    const industryConc = aggregateRows(filtered, 'industry', false);

    return (
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6}>
          {renderSubTable(`Top ${topN} Borrower`, topBorrowers, filteredPOS, true)}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderSubTable('Sector Concentration', sectorConc, filteredPOS, false)}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderSubTable('Risk Rating', ratingDist, filteredPOS, false)}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderSubTable('Industry Concentration', industryConc, filteredPOS, false)}
        </Grid>
      </Grid>
    );
  }

  // ── Loading ──
  if (loadingDelinq || loadingPAR) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ═══════ GROUP A: KPI Strip ═══════ */}
      <Card sx={{ p: 2 }}>
        <KPIRow items={kpiItems} />
      </Card>

      {/* ═══════ GROUP B: PAR Trend Line Chart ═══════ */}
      {parTrendData.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Box sx={{ height: 380 }}>
            <PARTrendLineChart data={parTrendData} />
          </Box>
        </Card>
      )}

      {/* ═══════ GROUP C: DPD Donut + PAR Summary Table ═══════ */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <DelinquencyBucketDonut
            data={bucketDonutData}
            onSliceClick={(bucket) => setDpdBucketFilter((prev) => (prev === bucket ? null : bucket))}
          />
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
              PAR Summary
            </Typography>
            {parSummary.periods.length === 0 ? (
              <Typography variant="caption" color="text.secondary">No PAR trend data</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...HDR, bgcolor: HDR_BG }}>Bucket</TableCell>
                      {parSummary.periods.map((p) => (
                        <TableCell key={p} align="right" sx={{ ...HDR, bgcolor: HDR_BG }}>{p}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parSummary.buckets.map((bucket) => (
                      <TableRow key={bucket} hover>
                        <TableCell sx={{ ...CELL, color: PAR_COLORS[bucket], fontWeight: 700 }}>
                          {bucket}
                        </TableCell>
                        {parSummary.periods.map((period) => {
                          const rate = parSummary.rateMap.get(`${bucket}|${period}`) ?? 0;
                          const pct = rate * 100;
                          const cellColor = pct > 7 ? '#f44336' : pct > 3 ? '#ff9800' : '#4caf50';
                          return (
                            <TableCell
                              key={period}
                              align="right"
                              sx={{ ...CELL, color: cellColor, fontWeight: pct > 5 ? 700 : undefined }}
                            >
                              {pct.toFixed(1)}%
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* ═══════ GROUP D: Tabbed DPD Analysis (30+ / 60+ / 90+) ═══════ */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            DPD Analysis
          </Typography>
          <Tabs
            value={analysisTab}
            onChange={(_, v) => setAnalysisTab(v)}
            sx={{
              minHeight: 32,
              '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, fontSize: '0.72rem', fontWeight: 600 },
              '& .MuiTabs-indicator': { height: 2 },
            }}
          >
            <Tab label="30+ DPD" />
            <Tab label="60+ DPD" />
            <Tab label="90+ DPD" />
          </Tabs>
        </Box>
        {renderAnalysisPanel(analysisTab)}
      </Card>

      {/* ═══════ GROUP E: Full Detail Table ═══════ */}
      <Card sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            Delinquency Detail
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Show</Typography>
            <FormControl size="small" sx={{ minWidth: 72 }}>
              <Select
                value={borrowerLimit}
                onChange={(e) => setBorrowerLimit(e.target.value as number)}
                sx={{ fontSize: '0.72rem', height: 28, fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <MenuItem key={n} value={n} sx={{ fontSize: '0.72rem' }}>{n}</MenuItem>
                ))}
                <MenuItem value={-1} sx={{ fontSize: '0.72rem' }}>All</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              of {filteredRows.length} borrowers
            </Typography>
          </Box>
        </Box>

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>
            DPD
          </Typography>
          <Chip
            label="All"
            size="small"
            variant={dpdBucketFilter === null ? 'filled' : 'outlined'}
            color={dpdBucketFilter === null ? 'primary' : 'default'}
            onClick={() => setDpdBucketFilter(null)}
            sx={{ fontSize: '0.62rem', height: 22 }}
          />
          {['1-30 DPD', '31-60 DPD', '61-90 DPD', '90+ DPD'].map((b) => (
            <Chip
              key={b}
              label={b}
              size="small"
              variant={dpdBucketFilter === b ? 'filled' : 'outlined'}
              color={dpdBucketFilter === b ? 'primary' : 'default'}
              onClick={() => toggleBucket(b)}
              sx={{ fontSize: '0.62rem', height: 22 }}
            />
          ))}

          <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 0.5 }} />

          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>
            Status
          </Typography>
          <Chip
            label="All"
            size="small"
            variant={statusFilter === null ? 'filled' : 'outlined'}
            color={statusFilter === null ? 'primary' : 'default'}
            onClick={() => setStatusFilter(null)}
            sx={{ fontSize: '0.62rem', height: 22 }}
          />
          {Object.keys(STATUS_COLORS).map((s) => (
            <Chip
              key={s}
              label={s}
              size="small"
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? 'primary' : 'default'}
              onClick={() => toggleStatus(s)}
              sx={{ fontSize: '0.62rem', height: 22 }}
            />
          ))}
        </Box>

        {/* Table */}
        {filteredRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No delinquency data matching filters</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HDR}>Customer</TableCell>
                  <TableCell sx={HDR}>Sector</TableCell>
                  <TableCell sx={HDR}>Industry</TableCell>
                  <TableCell align="right" sx={HDR}>Sanctioned</TableCell>
                  <TableCell align="right" sx={HDR}>Disbursed</TableCell>
                  <TableCell align="right" sx={HDR}>Current POS</TableCell>
                  <TableCell align="right" sx={HDR}>Sec. Cover</TableCell>
                  <TableCell sx={HDR}>Rtg at Disb.</TableCell>
                  <TableCell sx={HDR}>Current Rtg</TableCell>
                  <TableCell align="right" sx={HDR}>DPD</TableCell>
                  <TableCell sx={HDR}>DPD Bucket</TableCell>
                  <TableCell sx={HDR}>Status</TableCell>
                  <TableCell sx={HDR}>Reason</TableCell>
                  <TableCell sx={HDR}>Next Step</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedRows.map((row, idx) => {
                  const downgraded = isDowngraded(row.ratingAtDisbursement, row.currentRating);
                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={CELL_TEXT}>{row.customerName}</TableCell>
                      <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                      <TableCell sx={CELL_TEXT}>{row.industry}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedLimit)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursedAmount)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.currentPOS)}</TableCell>
                      <TableCell align="right" sx={CELL}>{row.securityCover.toFixed(2)}x</TableCell>
                      <TableCell sx={CELL}>{row.ratingAtDisbursement}</TableCell>
                      <TableCell sx={{ ...CELL, color: downgraded ? '#f44336' : undefined, fontWeight: downgraded ? 700 : undefined }}>
                        {row.currentRating}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, color: dpdColor(row.currentDPD), fontWeight: 700 }}>
                        {row.currentDPD}
                      </TableCell>
                      <TableCell>{bucketChip(getDPDBucket(row.currentDPD))}</TableCell>
                      <TableCell>{statusChip(row.currentStatus)}</TableCell>
                      <TableCell sx={{ ...CELL_TEXT, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.reasonForDelinquency}
                      </TableCell>
                      <TableCell sx={{ ...CELL_TEXT, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.nextStep}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
