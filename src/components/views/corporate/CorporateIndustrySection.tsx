'use client';

import { useState, useMemo } from 'react';
import {
  Box, Card, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Grid, Chip, FormControl, Select, MenuItem, IconButton, Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { IndustryBarChart } from '@/components/charts/corporate/IndustryBarChart';
import { useCorporateIndustryConcentration } from '@/hooks/useCorporateData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, ConcentrationNode } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

// ── Styling constants ────────────────────────────────────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const HDR_BG = 'rgba(0,0,0,0.03)';

export function CorporateIndustrySection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: industryData, isLoading } = useCorporateIndustryConcentration(scope);

  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<number>(20);

  const rows = useMemo(() => industryData ?? [], [industryData]);

  // ── Unique periods ─────────────────────────────────────────────
  const periods = useMemo(
    () => Array.from(new Set(rows.map(r => r.period))).sort(),
    [rows],
  );

  // ── Period-filtered rows ───────────────────────────────────────
  const filteredRows = useMemo(
    () => (periodFilter ? rows.filter(r => r.period === periodFilter) : rows),
    [rows, periodFilter],
  );

  // ── Aggregate by sector ────────────────────────────────────────
  const aggregated = useMemo(() => {
    const map = new Map<string, {
      sector: string; disbursement: number; pos: number;
      irr: number; irrCount: number; facilityCount: number;
    }>();
    filteredRows.forEach(r => {
      const existing = map.get(r.sector);
      if (existing) {
        existing.disbursement += r.disbursement;
        existing.pos += r.pos;
        existing.facilityCount += r.facilityCount;
        if (r.irr != null) { existing.irr += r.irr; existing.irrCount++; }
      } else {
        map.set(r.sector, {
          sector: r.sector,
          disbursement: r.disbursement,
          pos: r.pos,
          irr: r.irr ?? 0,
          irrCount: r.irr != null ? 1 : 0,
          facilityCount: r.facilityCount,
        });
      }
    });
    const vals = Array.from(map.values());
    const totalDisbursement = vals.reduce((s, v) => s + v.disbursement, 0);
    const totalPOS = vals.reduce((s, v) => s + v.pos, 0);
    return vals.map(v => ({
      sector: v.sector,
      disbursement: v.disbursement,
      pos: v.pos,
      share: totalPOS > 0 ? v.pos / totalPOS : 0,
      disbShare: totalDisbursement > 0 ? v.disbursement / totalDisbursement : 0,
      irr: v.irrCount > 0 ? v.irr / v.irrCount : null,
      facilityCount: v.facilityCount,
    })).sort((a, b) => b.pos - a.pos);
  }, [filteredRows]);

  // ── Treemap data ───────────────────────────────────────────────
  const treemapData: ConcentrationNode[] = useMemo(
    () => aggregated.map(r => ({
      name: r.sector,
      entity: '',
      category: 'sector',
      value: r.pos,
      portfolioShare: r.share,
      facilities: r.facilityCount,
      rating: '',
    })),
    [aggregated],
  );

  // ── Sector drill-down rows ─────────────────────────────────────
  const drillDownRows = useMemo(() => {
    if (!selectedSector) return [];
    const sectorRows = rows.filter(r => r.sector === selectedSector);
    // Compute total disbursement per period across all sectors
    const periodTotals = new Map<string, number>();
    rows.forEach(r => {
      periodTotals.set(r.period, (periodTotals.get(r.period) ?? 0) + r.disbursement);
    });
    return sectorRows
      .map(r => ({
        period: r.period,
        disbursement: r.disbursement,
        disbPctOfTotal: (periodTotals.get(r.period) ?? 0) > 0
          ? r.disbursement / periodTotals.get(r.period)!
          : 0,
        pos: r.pos,
        portfolioShare: r.portfolioShare,
        irr: r.irr,
        facilityCount: r.facilityCount,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [rows, selectedSector]);

  // ── Table totals ───────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalDisb = aggregated.reduce((s, r) => s + r.disbursement, 0);
    const totalPOS = aggregated.reduce((s, r) => s + r.pos, 0);
    const totalFacilities = aggregated.reduce((s, r) => s + r.facilityCount, 0);
    const irrEntries = aggregated.filter(r => r.irr != null);
    const avgIrr = irrEntries.length > 0
      ? irrEntries.reduce((s, r) => s + r.irr!, 0) / irrEntries.length
      : null;
    return { totalDisb, totalPOS, totalFacilities, avgIrr };
  }, [aggregated]);

  // ── Visible rows for detail table ──────────────────────────────
  const visibleRows = rowLimit === -1 ? aggregated : aggregated.slice(0, rowLimit);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── GROUP A: Period Filter Strip ──────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
        <Chip
          label="All"
          size="small"
          variant={periodFilter === null ? 'filled' : 'outlined'}
          color={periodFilter === null ? 'primary' : 'default'}
          onClick={() => setPeriodFilter(null)}
          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
        />
        {periods.map(p => (
          <Chip
            key={p}
            label={p}
            size="small"
            variant={periodFilter === p ? 'filled' : 'outlined'}
            color={periodFilter === p ? 'primary' : 'default'}
            onClick={() => setPeriodFilter(periodFilter === p ? null : p)}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
        ))}
      </Box>

      {/* ── GROUP B: Two charts side-by-side ─────────────────────── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ConcentrationTreemap data={treemapData} groupBy="sector" />
        </Grid>
        <Grid item xs={12} md={6}>
          <IndustryBarChart
            data={aggregated.map(r => ({
              sector: r.sector,
              disbursement: r.disbursement,
              pos: r.pos,
              share: r.share,
              irr: r.irr,
            }))}
            onBarClick={setSelectedSector}
          />
        </Grid>
      </Grid>

      {/* ── GROUP C: Sector Drill-Down ───────────────────────────── */}
      <Collapse in={!!selectedSector}>
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {selectedSector} — Period Breakdown
            </Typography>
            <IconButton size="small" onClick={() => setSelectedSector(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {drillDownRows.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No data for this sector</Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...HDR, background: HDR_BG }}>Period</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Disbursement</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>% of Total Disb.</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>POS</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Portfolio Share</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>IRR</TableCell>
                    <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Facilities</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillDownRows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={CELL_TEXT}>{row.period}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursement)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatPercent(row.disbPctOfTotal)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.pos)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatPercent(row.portfolioShare)}</TableCell>
                      <TableCell align="right" sx={CELL}>{row.irr != null ? formatPercent(row.irr) : '—'}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatNumber(row.facilityCount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Collapse>

      {/* ── GROUP D: Industry Concentration Detail Table ──────────── */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            Industry Concentration Detail
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={rowLimit}
              onChange={(e) => setRowLimit(Number(e.target.value))}
              sx={{ fontSize: '0.72rem', height: 28 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={-1}>All</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {aggregated.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No industry data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...HDR, background: HDR_BG }}>Sector</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Disbursement</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>% of Total Disb.</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>POS</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Portfolio Share %</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>IRR</TableCell>
                  <TableCell align="right" sx={{ ...HDR, background: HDR_BG }}>Facility Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursement)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatPercent(row.disbShare)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.pos)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatPercent(row.share)}</TableCell>
                    <TableCell align="right" sx={CELL}>{row.irr != null ? formatPercent(row.irr) : '—'}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatNumber(row.facilityCount)}</TableCell>
                  </TableRow>
                ))}
                {/* ── Total row ──────────────────────────────────── */}
                <TableRow sx={{ '& td': { background: '#fff9c4', fontWeight: 700 } }}>
                  <TableCell sx={{ ...CELL_TEXT, fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totals.totalDisb)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100.00%</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totals.totalPOS)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100.00%</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{totals.avgIrr != null ? formatPercent(totals.avgIrr) : '—'}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatNumber(totals.totalFacilities)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
