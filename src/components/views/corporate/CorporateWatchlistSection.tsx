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
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { WatchlistTriggerDonut } from '@/components/charts/corporate/WatchlistTriggerDonut';
import { WatchlistStatusBar } from '@/components/charts/corporate/WatchlistStatusBar';
import { WatchlistExposureBar } from '@/components/charts/corporate/WatchlistExposureBar';
import { WatchlistTrendChart } from '@/components/charts/corporate/WatchlistTrendChart';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { useCorporateWatchlist, useCorporateWatchlistTrend } from '@/hooks/useCorporateData';
import { formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

// ── Styling constants (match CorporateRatingSection) ─────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };

// ── Trigger category colors ──────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Financial: '#1565c0',
  Operational: '#2e7d32',
  External: '#00838f',
  Behavioral: '#e65100',
};

// ── Status colors ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Active Watch': '#ff9800',
  Escalated: '#f44336',
  Monitoring: '#42a5f5',
  'Review Pending': '#78909c',
};

// ── Trigger info cards data (from reference screenshot) ──────────
const TRIGGER_INFO = [
  {
    category: 'Financial',
    color: '#1565c0',
    title: 'Financial Trigger',
    description: 'Ratio deterioration, losses, covenant breach.',
  },
  {
    category: 'Operational',
    color: '#2e7d32',
    title: 'Operational Trigger',
    description: 'Mgmt change, litigation, regulatory issue.',
  },
  {
    category: 'External',
    color: '#00838f',
    title: 'External Trigger',
    description: 'Sector stress, macro headwinds, geopolitical.',
  },
  {
    category: 'Behavioral',
    color: '#e65100',
    title: 'Behavioral Trigger',
    description: 'Irregular transactions, account conduct, decrease in banking throughput.',
  },
];

// ── Rating bands for comparison ──────────────────────────────────
const RATING_BANDS = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B', 'C/D', 'Unrated',
];

function statusChip(status: string) {
  const color = STATUS_COLORS[status] ?? '#78909c';
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        fontSize: '0.65rem',
        height: 20,
        bgcolor: `${color}26`,
        color,
        fontWeight: 600,
      }}
    />
  );
}

function categoryChip(category: string) {
  const color = CATEGORY_COLORS[category] ?? '#78909c';
  return (
    <Chip
      label={category}
      size="small"
      sx={{
        fontSize: '0.6rem',
        height: 18,
        bgcolor: `${color}1A`,
        color,
        fontWeight: 600,
      }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────
export function CorporateWatchlistSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: watchlist, isLoading } = useCorporateWatchlist(scope);
  const { data: trendData } = useCorporateWatchlistTrend(scope);

  // ── State ──
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [borrowerLimit, setBorrowerLimit] = useState<number>(20);

  const rows = useMemo(() => watchlist ?? [], [watchlist]);

  // ── KPI Items ──
  const kpiItems = useMemo((): KPIItem[] => {
    const activeCount = rows.filter((r) => r.status === 'Active Watch').length;
    const totalExposure = rows.reduce((s, r) => s + r.exposureNum, 0);
    const escalatedCount = rows.filter((r) => r.status === 'Escalated').length;
    const avgDays = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.daysOnWatchlist, 0) / rows.length)
      : 0;

    return [
      {
        label: 'Active Watch',
        value: String(activeCount),
        color: '#ff9800',
        subtitle: 'Borrowers on active watch',
      },
      {
        label: 'Total Exposure',
        value: formatCurrency(totalExposure),
        color: '#1565c0',
        subtitle: 'Total watchlist exposure',
      },
      {
        label: 'Escalated',
        value: String(escalatedCount),
        color: '#f44336',
        subtitle: 'Accounts requiring escalation',
      },
      {
        label: 'Avg Days on Watch',
        value: `${avgDays}d`,
        color: '#78909c',
        subtitle: 'Average watchlist duration',
      },
    ];
  }, [rows, formatCurrency]);

  // ── Trigger category chart data ──
  const triggerChartData = useMemo(() => {
    const map = new Map<string, { exposure: number; count: number }>();
    rows.forEach((r) => {
      const cat = r.triggerCategory || 'Financial';
      const prev = map.get(cat) ?? { exposure: 0, count: 0 };
      map.set(cat, { exposure: prev.exposure + r.exposureNum, count: prev.count + 1 });
    });
    const result: { category: string; exposure: number; count: number }[] = [];
    map.forEach((v, k) => result.push({ category: k, ...v }));
    return result;
  }, [rows]);

  // ── Status chart data ──
  const statusChartData = useMemo(() => {
    const map = new Map<string, { count: number; exposure: number }>();
    rows.forEach((r) => {
      const prev = map.get(r.status) ?? { count: 0, exposure: 0 };
      map.set(r.status, { count: prev.count + 1, exposure: prev.exposure + r.exposureNum });
    });
    const result: { status: string; count: number; exposure: number }[] = [];
    map.forEach((v, k) => result.push({ status: k, ...v }));
    return result;
  }, [rows]);

  // ── Sector exposure chart data ──
  const sectorChartData = useMemo(() => {
    const map = new Map<string, { exposure: number; count: number }>();
    rows.forEach((r) => {
      const prev = map.get(r.sector) ?? { exposure: 0, count: 0 };
      map.set(r.sector, { exposure: prev.exposure + r.exposureNum, count: prev.count + 1 });
    });
    const result: { sector: string; exposure: number; count: number }[] = [];
    map.forEach((v, k) => result.push({ sector: k, ...v }));
    return result;
  }, [rows]);

  const totalExposure = rows.reduce((s, r) => s + r.exposureNum, 0);

  // ── Filtered rows for detail table ──
  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (triggerFilter) result = result.filter((r) => r.triggerCategory === triggerFilter);
    if (sectorFilter) result = result.filter((r) => r.sector === sectorFilter);
    return result;
  }, [rows, statusFilter, triggerFilter, sectorFilter]);

  const displayedRows = borrowerLimit === -1 ? filteredRows : filteredRows.slice(0, borrowerLimit);

  // ── Filter toggle helpers ──
  const toggleStatus = (s: string) => setStatusFilter((prev) => (prev === s ? null : s));
  const toggleTrigger = (t: string) => setTriggerFilter((prev) => (prev === t ? null : t));

  // ── Loading ──
  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ═══════ GROUP A: KPI Strip ═══════ */}
      <Card sx={{ p: 2 }}>
        <KPIRow items={kpiItems} />
      </Card>

      {/* ═══════ GROUP B: Watchlist Trend (6-month) ═══════ */}
      {trendData && trendData.length > 0 && (
        <Box sx={{ height: 420 }}>
          <WatchlistTrendChart data={trendData} />
        </Box>
      )}

      {/* ═══════ GROUP C: Two Charts Side-by-Side ═══════ */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <WatchlistTriggerDonut
            data={triggerChartData}
            onSliceClick={(cat) => setTriggerFilter((prev) => (prev === cat ? null : cat))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <WatchlistStatusBar
            data={statusChartData}
            onBarClick={(s) => setStatusFilter((prev) => (prev === s ? null : s))}
          />
        </Grid>
      </Grid>

      {/* ═══════ GROUP C: Trigger Type Info Cards ═══════ */}
      <Grid container spacing={2}>
        {TRIGGER_INFO.map((info) => {
          const catData = triggerChartData.find((d) => d.category === info.category);
          return (
            <Grid item xs={12} sm={6} md={3} key={info.category}>
              <Card
                sx={{
                  p: 2,
                  borderTop: `4px solid ${info.color}`,
                  height: '100%',
                  cursor: 'pointer',
                  opacity: triggerFilter && triggerFilter !== info.category ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
                onClick={() => toggleTrigger(info.category)}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, fontSize: '0.8rem', color: info.color, mb: 0.5 }}
                >
                  {info.title}
                </Typography>
                {catData && (
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    {catData.count} borrower{catData.count !== 1 ? 's' : ''} · {formatCurrency(catData.exposure)}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
                  {info.description}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ═══════ GROUP D: Exposure by Sector ═══════ */}
      <Box sx={{ height: 380 }}>
        <WatchlistExposureBar
          data={sectorChartData}
          totalExposure={totalExposure}
          onBarClick={(sector) => setSectorFilter((prev) => (prev === sector ? null : sector))}
        />
      </Box>

      {/* ═══════ GROUP E: Watchlist Detail Table ═══════ */}
      <Card sx={{ p: 2 }}>
        {/* Header with title + filters + row limit */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            Watchlist Detail
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

          <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 0.5 }} />

          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>
            Trigger
          </Typography>
          <Chip
            label="All"
            size="small"
            variant={triggerFilter === null ? 'filled' : 'outlined'}
            color={triggerFilter === null ? 'primary' : 'default'}
            onClick={() => setTriggerFilter(null)}
            sx={{ fontSize: '0.62rem', height: 22 }}
          />
          {Object.keys(CATEGORY_COLORS).map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              variant={triggerFilter === t ? 'filled' : 'outlined'}
              color={triggerFilter === t ? 'primary' : 'default'}
              onClick={() => toggleTrigger(t)}
              sx={{ fontSize: '0.62rem', height: 22 }}
            />
          ))}

          {sectorFilter && (
            <>
              <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 0.5 }} />
              <Chip
                label={`Sector: ${sectorFilter}`}
                size="small"
                variant="filled"
                color="primary"
                onDelete={() => setSectorFilter(null)}
                sx={{ fontSize: '0.62rem', height: 22 }}
              />
            </>
          )}
        </Box>

        {/* Table */}
        {filteredRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No watchlist data matching filters</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HDR}>Borrower</TableCell>
                  <TableCell sx={HDR}>Sector</TableCell>
                  <TableCell align="right" sx={HDR}>Exposure</TableCell>
                  <TableCell sx={HDR}>EWS Trigger</TableCell>
                  <TableCell sx={HDR}>Category</TableCell>
                  <TableCell sx={HDR}>Prior Rating</TableCell>
                  <TableCell sx={HDR}>Current Rating</TableCell>
                  <TableCell align="right" sx={HDR}>Days on Watch</TableCell>
                  <TableCell sx={HDR}>Status</TableCell>
                  <TableCell sx={HDR}>Remedial Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedRows.map((row, idx) => {
                  const priorIdx = RATING_BANDS.indexOf(row.priorRating);
                  const curIdx = RATING_BANDS.indexOf(row.internalRating);
                  const isWorse = curIdx > priorIdx && priorIdx >= 0 && curIdx >= 0;

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={CELL_TEXT}>{row.borrower}</TableCell>
                      <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.exposureNum)}</TableCell>
                      <TableCell sx={{ ...CELL_TEXT, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.ewsTriggerType}
                      </TableCell>
                      <TableCell>{categoryChip(row.triggerCategory)}</TableCell>
                      <TableCell sx={CELL}>{row.priorRating}</TableCell>
                      <TableCell sx={{ ...CELL, color: isWorse ? '#f44336' : undefined, fontWeight: isWorse ? 700 : undefined }}>
                        {row.internalRating}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: row.daysOnWatchlist > 180 ? 700 : undefined, color: row.daysOnWatchlist > 180 ? '#ff9800' : undefined }}>
                        {formatNumber(row.daysOnWatchlist)}
                      </TableCell>
                      <TableCell>{statusChip(row.status)}</TableCell>
                      <TableCell sx={{ ...CELL_TEXT, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.remedialAction}
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
