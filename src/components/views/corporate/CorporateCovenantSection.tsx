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
  Popover,
  Link,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { CovenantCategoryDonut } from '@/components/charts/corporate/CovenantCategoryDonut';
import { CovenantComplianceDonut } from '@/components/charts/corporate/CovenantComplianceDonut';
import { useCorporateCovenants } from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const HDR_BG = 'rgba(0,0,0,0.03)';

export function CorporateCovenantSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: covenants, isLoading } = useCorporateCovenants(scope);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [frequencyFilter, setFrequencyFilter] = useState<string | null>(null);
  const [flagFilter, setFlagFilter] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<number>(20);
  const [rmAnchor, setRmAnchor] = useState<HTMLElement | null>(null);
  const [rmDetail, setRmDetail] = useState<{ name: string; email: string; phone: string; dept: string } | null>(null);

  const rows = useMemo(() => covenants ?? [], [covenants]);

  // ── Computed values ────────────────────────────────────────────────

  // Breach rate
  const breachRate = useMemo(() => {
    if (rows.length === 0) return 0;
    const breached = rows.filter(r => r.npaFlag || r.restructuredFlag).length;
    return breached / rows.length;
  }, [rows]);

  // Category donut data
  const categoryData = useMemo(() => {
    const map = new Map<string, { count: number; exposure: number }>();
    rows.forEach(r => {
      const cat = r.covenantCategory || 'Other';
      const existing = map.get(cat) ?? { count: 0, exposure: 0 };
      existing.count++;
      existing.exposure += r.currentPOS;
      map.set(cat, existing);
    });
    return Array.from(map.entries()).map(([category, v]) => ({ category, ...v }));
  }, [rows]);

  // Compliance donut data (Compliant / Breached / Pending Extension)
  const complianceData = useMemo(() => {
    let compliant = 0, breached = 0, pending = 0;
    rows.forEach(r => {
      if (r.npaFlag || r.restructuredFlag) breached++;
      else if (r.approvalForExtension === 'Pending') pending++;
      else compliant++;
    });
    return [
      { status: 'Compliant', count: compliant },
      { status: 'Breached', count: breached },
      { status: 'Pending Extension', count: pending },
    ].filter(d => d.count > 0);
  }, [rows]);

  // Category summary for table
  const categorySummary = useMemo(() => {
    const map = new Map<string, { cases: number; disbursed: number; pos: number; breached: number; extensions: number }>();
    rows.forEach(r => {
      const cat = r.covenantCategory || 'Other';
      const existing = map.get(cat) ?? { cases: 0, disbursed: 0, pos: 0, breached: 0, extensions: 0 };
      existing.cases++;
      existing.disbursed += r.disbursedAmount;
      existing.pos += r.currentPOS;
      if (r.npaFlag || r.restructuredFlag) existing.breached++;
      if (r.approvalForExtension === 'Approved') existing.extensions++;
      map.set(cat, existing);
    });
    return Array.from(map.entries()).map(([category, v]) => ({ category, ...v }));
  }, [rows]);

  // Extensions approved count (for KPI)
  const extensionsApproved = useMemo(() => rows.filter(r => r.approvalForExtension === 'Approved').length, [rows]);

  // Financial covenant count (for KPI)
  const financialCount = useMemo(() => rows.filter(r => r.covenantCategory === 'Financial').length, [rows]);

  // Filtered rows for detail table
  const filteredRows = useMemo(() => {
    let result = rows;
    if (categoryFilter) result = result.filter(r => r.covenantCategory === categoryFilter);
    if (frequencyFilter) result = result.filter(r => r.covenantFrequency === frequencyFilter);
    if (flagFilter === 'NPA') result = result.filter(r => r.npaFlag);
    else if (flagFilter === 'Watchlist') result = result.filter(r => r.watchlistFlag);
    else if (flagFilter === 'Restructured') result = result.filter(r => r.restructuredFlag);
    return result;
  }, [rows, categoryFilter, frequencyFilter, flagFilter]);

  // Unique categories and frequencies for filter chips
  const categories = useMemo(() => Array.from(new Set(rows.map(r => r.covenantCategory))).filter(Boolean), [rows]);
  const frequencies = useMemo(() => Array.from(new Set(rows.map(r => r.covenantFrequency))).filter(Boolean), [rows]);

  // Display rows with limit
  const displayRows = rowLimit === -1 ? filteredRows : filteredRows.slice(0, rowLimit);

  if (isLoading) return <LoadingSkeleton />;

  // ── KPI Strip ──────────────────────────────────────────────────────
  const kpis: KPIItem[] = [
    { label: 'Total Covenants', value: String(rows.length), color: '#1565c0' },
    { label: 'Breach Rate', value: formatPercent(breachRate), color: breachRate > 0.15 ? '#f44336' : '#ff9800', metricKey: 'corp_covenant_breach_rate', rawValue: breachRate },
    { label: 'Financial Covenants', value: String(financialCount), color: '#1976d2' },
    { label: 'Extensions Approved', value: String(extensionsApproved), color: '#4caf50' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── GROUP A: KPI Strip ──────────────────────────────────────── */}
      <KPIRow items={kpis} />

      {/* ── GROUP B: Two Charts Side-by-Side ────────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ height: 370 }}>
              <CovenantCategoryDonut
                data={categoryData}
                onSliceClick={(cat) => setCategoryFilter(categoryFilter === cat ? null : cat)}
              />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ height: 370 }}>
              <CovenantComplianceDonut data={complianceData} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── GROUP C: Category Summary Table ─────────────────────────── */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Category Summary
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: HDR_BG }}>
              <TableCell sx={HDR}>Category</TableCell>
              <TableCell align="right" sx={HDR}>Cases</TableCell>
              <TableCell align="right" sx={HDR}>Disbursed</TableCell>
              <TableCell align="right" sx={HDR}>POS</TableCell>
              <TableCell align="right" sx={HDR}>Breached</TableCell>
              <TableCell align="right" sx={HDR}>Extensions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categorySummary.map(row => (
              <TableRow key={row.category} hover>
                <TableCell sx={CELL_TEXT}>{row.category}</TableCell>
                <TableCell align="right" sx={CELL}>{row.cases}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursed)}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.pos)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, color: row.breached > 0 ? '#f44336' : 'inherit' }}>{row.breached}</TableCell>
                <TableCell align="right" sx={CELL}>{row.extensions}</TableCell>
              </TableRow>
            ))}
            {/* Total row */}
            <TableRow sx={{ bgcolor: '#fff9c4' }}>
              <TableCell sx={{ ...CELL_TEXT, fontWeight: 700 }}>Total</TableCell>
              <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{categorySummary.reduce((s, r) => s + r.cases, 0)}</TableCell>
              <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(categorySummary.reduce((s, r) => s + r.disbursed, 0))}</TableCell>
              <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(categorySummary.reduce((s, r) => s + r.pos, 0))}</TableCell>
              <TableCell align="right" sx={{ ...CELL, fontWeight: 700, color: '#f44336' }}>{categorySummary.reduce((s, r) => s + r.breached, 0)}</TableCell>
              <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{categorySummary.reduce((s, r) => s + r.extensions, 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* ── GROUP D: Detail Table with Filters ──────────────────────── */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Covenant Details
        </Typography>

        {/* Filter Strip */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
          {/* Category chips */}
          <Chip
            label="All"
            size="small"
            variant={categoryFilter === null ? 'filled' : 'outlined'}
            color={categoryFilter === null ? 'primary' : 'default'}
            onClick={() => setCategoryFilter(null)}
            sx={{ fontSize: '0.65rem', height: 24 }}
          />
          {categories.map(cat => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              variant={categoryFilter === cat ? 'filled' : 'outlined'}
              color={categoryFilter === cat ? 'primary' : 'default'}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              sx={{ fontSize: '0.65rem', height: 24 }}
            />
          ))}

          <Box sx={{ width: 1, height: 16, borderLeft: '1px solid', borderColor: 'divider', mx: 0.5 }} />

          {/* Frequency chips */}
          <Chip
            label="All Freq"
            size="small"
            variant={frequencyFilter === null ? 'filled' : 'outlined'}
            color={frequencyFilter === null ? 'secondary' : 'default'}
            onClick={() => setFrequencyFilter(null)}
            sx={{ fontSize: '0.65rem', height: 24 }}
          />
          {frequencies.map(freq => (
            <Chip
              key={freq}
              label={freq}
              size="small"
              variant={frequencyFilter === freq ? 'filled' : 'outlined'}
              color={frequencyFilter === freq ? 'secondary' : 'default'}
              onClick={() => setFrequencyFilter(frequencyFilter === freq ? null : freq)}
              sx={{ fontSize: '0.65rem', height: 24 }}
            />
          ))}

          <Box sx={{ width: 1, height: 16, borderLeft: '1px solid', borderColor: 'divider', mx: 0.5 }} />

          {/* Flag chips */}
          {(['All', 'NPA', 'Watchlist', 'Restructured'] as const).map(flag => (
            <Chip
              key={flag}
              label={flag}
              size="small"
              variant={(flag === 'All' ? flagFilter === null : flagFilter === flag) ? 'filled' : 'outlined'}
              color={(flag === 'All' ? flagFilter === null : flagFilter === flag) ? 'warning' : 'default'}
              onClick={() => setFlagFilter(flag === 'All' ? null : (flagFilter === flag ? null : flag))}
              sx={{ fontSize: '0.65rem', height: 24 }}
            />
          ))}

          <Box sx={{ ml: 'auto' }} />

          {/* Row limit selector */}
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={rowLimit}
              onChange={(e) => setRowLimit(Number(e.target.value))}
              sx={{ fontSize: '0.7rem', height: 28 }}
            >
              <MenuItem value={10}>10 rows</MenuItem>
              <MenuItem value={20}>20 rows</MenuItem>
              <MenuItem value={50}>50 rows</MenuItem>
              <MenuItem value={100}>100 rows</MenuItem>
              <MenuItem value={-1}>All</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Results count */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Showing {displayRows.length} of {filteredRows.length} covenants
        </Typography>

        {/* Detail Table */}
        {filteredRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No covenant data matching filters</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: HDR_BG }}>
                  <TableCell sx={HDR}>Customer</TableCell>
                  <TableCell sx={HDR}>RM</TableCell>
                  <TableCell sx={HDR}>Facility Type</TableCell>
                  <TableCell align="right" sx={HDR}>Sanctioned</TableCell>
                  <TableCell align="right" sx={HDR}>Disbursed</TableCell>
                  <TableCell align="right" sx={HDR}>POS</TableCell>
                  <TableCell sx={HDR}>Security Type</TableCell>
                  <TableCell align="right" sx={HDR}>Security Cover</TableCell>
                  <TableCell sx={HDR}>Rating</TableCell>
                  <TableCell sx={HDR}>Category</TableCell>
                  <TableCell sx={HDR}>Covenant Type</TableCell>
                  <TableCell sx={HDR}>Description</TableCell>
                  <TableCell sx={HDR}>Frequency</TableCell>
                  <TableCell sx={HDR}>Creation Date</TableCell>
                  <TableCell sx={HDR}>Submission Date</TableCell>
                  <TableCell sx={HDR}>Extension</TableCell>
                  <TableCell sx={HDR}>Extended Closure</TableCell>
                  <TableCell sx={HDR}>Flags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.customerName}</TableCell>
                    <TableCell sx={CELL_TEXT}>
                      {row.rmName ? (
                        <Link
                          component="button"
                          variant="body2"
                          underline="hover"
                          sx={{ fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          onClick={(e) => {
                            setRmAnchor(e.currentTarget);
                            setRmDetail({ name: row.rmName, email: row.rmEmail, phone: row.rmPhone, dept: row.rmDepartment });
                          }}
                        >
                          {row.rmName}
                        </Link>
                      ) : (
                        '\u2014'
                      )}
                    </TableCell>
                    <TableCell sx={CELL_TEXT}>{row.facilityType}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedLimit)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursedAmount)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.currentPOS)}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.securityType}</TableCell>
                    <TableCell align="right" sx={CELL}>{row.securityCover.toFixed(2)}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.riskRating}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.covenantCategory}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.covenantType}</TableCell>
                    <TableCell
                      sx={{
                        ...CELL_TEXT,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.covenantDescription}
                    >
                      {row.covenantDescription}
                    </TableCell>
                    <TableCell sx={CELL_TEXT}>{row.covenantFrequency}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.creationDate || '\u2014'}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.submissionDate}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.approvalForExtension || '\u2014'}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.extendedClosureDate || '\u2014'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.npaFlag && (
                          <Chip
                            label="NPA"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(244,67,54,0.15)', color: '#f44336' }}
                          />
                        )}
                        {row.watchlistFlag && (
                          <Chip
                            label="WL"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800' }}
                          />
                        )}
                        {row.restructuredFlag && (
                          <Chip
                            label="Restruct"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(156,39,176,0.15)', color: '#ce93d8' }}
                          />
                        )}
                        {row.breached && (
                          <Chip
                            label={`Breach ${row.daysSinceBreach}d`}
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(244,67,54,0.10)', color: '#ef5350' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* RM Profile Popover */}
      <Popover
        open={Boolean(rmAnchor)}
        anchorEl={rmAnchor}
        onClose={() => { setRmAnchor(null); setRmDetail(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {rmDetail && (
          <Box sx={{ p: 2, minWidth: 240 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
              {rmDetail.name}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Department: <strong>{rmDetail.dept}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Email:{' '}
                <Link href={`mailto:${rmDetail.email}`} underline="hover" sx={{ fontSize: '0.72rem' }}>
                  {rmDetail.email}
                </Link>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Phone:{' '}
                <Link href={`tel:${rmDetail.phone}`} underline="hover" sx={{ fontSize: '0.72rem' }}>
                  {rmDetail.phone}
                </Link>
              </Typography>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
