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
  Collapse,
  IconButton,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { BreachBadge } from '@/components/common/BreachBadge';
import { ProvisioningTrendChart } from '@/components/charts/ProvisioningTrendChart';
import { useCorporateProvisioningECL } from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

/* ── Period helpers ─────────────────────────────────────────────── */

const MONTH_ORDER: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parsePeriod(p: string): number {
  const month = p.slice(0, 3);
  const year = parseInt('20' + p.slice(4), 10);
  return year * 12 + (MONTH_ORDER[month] ?? 0);
}

const TYPE_SUFFIX: Record<string, string> = {
  Actual: 'A',
  Estimated: 'E',
  Projected: 'P',
};

const TYPE_COLOR: Record<string, string> = {
  A: 'inherit',
  E: '#ff9800',
  P: '#2196f3',
};

/* ── Stages in fixed display order ─────────────────────────────── */

const STAGE_ORDER = ['Stage 1', 'Stage 2', 'Stage 3'];

/* ── Component ─────────────────────────────────────────────────── */

interface Props {
  scope?: ScopeSelection;
}

export function CorporateProvisioningSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: provisionData, isLoading } = useCorporateProvisioningECL(scope);
  const [detailOpen, setDetailOpen] = useState(false);

  const rows = useMemo(() => provisionData ?? [], [provisionData]);

  /* ── Sorted unique periods ───────────────────────────────────── */

  const sortedPeriods = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.period)));
    return unique.sort((a, b) => parsePeriod(a) - parsePeriod(b));
  }, [rows]);

  /* ── Period type lookup (first occurrence wins) ──────────────── */

  const periodTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (!map[r.period]) {
        map[r.period] = TYPE_SUFFIX[r.periodType] ?? 'A';
      }
    }
    return map;
  }, [rows]);

  /* ── Credit Cost Matrix data ─────────────────────────────────── */

  const matrixData = useMemo(() => {
    // For each stage+period, compute weighted-average credit cost
    // creditCost = sum(provisionAmount) / sum(grossExposure)
    const stageMap: Record<string, Record<string, { sumProv: number; sumGross: number }>> = {};

    for (const stage of STAGE_ORDER) {
      stageMap[stage] = {};
    }

    for (const r of rows) {
      const stage = r.ifrsStage;
      if (!stageMap[stage]) stageMap[stage] = {};
      if (!stageMap[stage][r.period]) {
        stageMap[stage][r.period] = { sumProv: 0, sumGross: 0 };
      }
      stageMap[stage][r.period].sumProv += r.provisionAmount;
      stageMap[stage][r.period].sumGross += r.grossExposure;
    }

    // Build per-stage rows
    const stageRows: { stage: string; values: Record<string, number> }[] = [];
    for (const stage of STAGE_ORDER) {
      const vals: Record<string, number> = {};
      for (const period of sortedPeriods) {
        const bucket = stageMap[stage]?.[period];
        if (bucket && bucket.sumGross > 0) {
          vals[period] = (bucket.sumProv / bucket.sumGross) * 100;
        } else {
          vals[period] = 0;
        }
      }
      stageRows.push({ stage, values: vals });
    }

    // Total CC per period
    const totalValues: Record<string, number> = {};
    for (const period of sortedPeriods) {
      let totalProv = 0;
      let totalGross = 0;
      for (const r of rows) {
        if (r.period === period) {
          totalProv += r.provisionAmount;
          totalGross += r.grossExposure;
        }
      }
      totalValues[period] = totalGross > 0 ? (totalProv / totalGross) * 100 : 0;
    }

    return { stageRows, totalValues };
  }, [rows, sortedPeriods]);

  /* ── Detail table: rows grouped by period ────────────────────── */

  const detailGrouped = useMemo(() => {
    return sortedPeriods.map((period) => ({
      period,
      rows: rows.filter((r) => r.period === period),
    }));
  }, [rows, sortedPeriods]);

  /* ── Render ──────────────────────────────────────────────────── */

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Credit Cost Trend Chart */}
      <ProvisioningTrendChart data={rows} />

      {/* Credit Cost Matrix Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Credit Cost Matrix
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No provisioning data available
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    Credit Cost:
                  </TableCell>
                  {sortedPeriods.map((period) => {
                    const suffix = periodTypeMap[period] ?? 'A';
                    return (
                      <TableCell
                        key={period}
                        align="right"
                        sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        {period}{' '}
                        <span style={{ color: TYPE_COLOR[suffix] }}>({suffix})</span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {matrixData.stageRows.map(({ stage, values }) => (
                  <TableRow key={stage} hover>
                    <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {stage}
                    </TableCell>
                    {sortedPeriods.map((period) => (
                      <TableCell
                        key={period}
                        align="right"
                        sx={{
                          fontSize: '0.75rem',
                          fontFamily: 'IBM Plex Mono, monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {values[period].toFixed(2)}%
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Total CC row */}
                <TableRow hover sx={{ bgcolor: 'rgba(25,118,210,0.06)' }}>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Total CC
                  </TableCell>
                  {sortedPeriods.map((period) => (
                    <TableCell
                      key={period}
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'IBM Plex Mono, monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {matrixData.totalValues[period].toFixed(2)}%
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* IFRS Provisioning Detail (Collapsible) */}
      <Card sx={{ p: 0 }}>
        <Box
          onClick={() => setDetailOpen((prev) => !prev)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <IconButton size="small" sx={{ p: 0 }}>
            {detailOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            IFRS Provisioning Detail
          </Typography>
        </Box>

        <Collapse in={detailOpen}>
          <Box sx={{ px: 2, pb: 2 }}>
            {rows.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No provisioning data available
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>IFRS Stage</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        Gross Exposure
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        Provision Amount
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                        PCR %
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailGrouped.map(({ period, rows: periodRows }) =>
                      periodRows.map((row, idx) => {
                        const suffix = TYPE_SUFFIX[row.periodType] ?? 'A';
                        return (
                          <TableRow key={`${period}-${idx}`} hover>
                            {idx === 0 ? (
                              <TableCell
                                rowSpan={periodRows.length}
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  verticalAlign: 'top',
                                }}
                              >
                                {period}
                              </TableCell>
                            ) : null}
                            {idx === 0 ? (
                              <TableCell
                                rowSpan={periodRows.length}
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  verticalAlign: 'top',
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-block',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 1,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    bgcolor:
                                      suffix === 'P'
                                        ? '#2196f3'
                                        : suffix === 'E'
                                          ? '#ff9800'
                                          : '#9e9e9e',
                                  }}
                                >
                                  ({suffix})
                                </Box>
                              </TableCell>
                            ) : null}
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.ifrsStage}</TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontSize: '0.75rem',
                                fontFamily: 'IBM Plex Mono, monospace',
                              }}
                            >
                              {formatCurrency(row.grossExposure)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontSize: '0.75rem',
                                fontFamily: 'IBM Plex Mono, monospace',
                              }}
                            >
                              {formatCurrency(row.provisionAmount)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontSize: '0.75rem',
                                fontFamily: 'IBM Plex Mono, monospace',
                              }}
                            >
                              <BreachBadge metricKey="corp_pcr" value={row.pcrPct}>
                                {formatPercent(row.pcrPct)}
                              </BreachBadge>
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Collapse>
      </Card>
    </Box>
  );
}
