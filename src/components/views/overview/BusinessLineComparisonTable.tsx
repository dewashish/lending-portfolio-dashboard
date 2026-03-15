'use client';

import {
  Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import { sortPeriods } from '@/lib/period-utils';
import type { ConsumerMetricRow, PortfolioSummary, CorporatePortfolioSummary, ScopeSelection } from '@/lib/types';

interface Props {
  consumerOverall: ConsumerMetricRow[];
  tradeSummary: PortfolioSummary | null;
  corporateSummary: CorporatePortfolioSummary | null;
  consumerAum: number;
  onTabChange?: (tabIndex: number) => void;
  unsecuredFPD?: ConsumerMetricRow[];
  groupExposure?: number;
  consumerNCL?: number | null;
  scope?: ScopeSelection;
}

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find(d => d.metric === name);
  if (!row) return null;
  const keys = sortPeriods(Object.keys(row.values));
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

interface CellData {
  value: string;
  metricKey?: string;
  rawValue?: number;
}

interface MetricRow {
  label: string;
  indent?: boolean;
  consumer: CellData;
  trade: CellData;
  corporate: CellData;
  total: CellData;
}

export function BusinessLineComparisonTable({
  consumerOverall,
  tradeSummary,
  corporateSummary,
  consumerAum,
  onTabChange,
  unsecuredFPD = [],
  groupExposure,
  consumerNCL,
  scope,
}: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { getColor } = useRiskAppetite();
  const ctx = buildThresholdContext(scope);

  const dpd30 = getLatest(consumerOverall, '30+ Amt%');
  const dpd90 = getLatest(consumerOverall, '90+ Amt%');
  const unsecuredFpd = getLatest(unsecuredFPD, 'FPD% (Unsecured)');

  const tradeO = tradeSummary?.totalAUM ?? 0;
  const corpPOS = corporateSummary?.totalPOS ?? 0;
  const totalExposure = groupExposure ?? (consumerAum + tradeO + corpPOS);

  // Blended Provision Coverage (exposure-weighted, Trade + Corporate)
  const tradePCR = tradeSummary?.provisionCoverage ?? null;
  const corpPCR = corporateSummary?.provisionCoverageRatio ?? null;
  const blendedPCR = tradePCR != null && corpPCR != null && (tradeO + corpPOS) > 0
    ? (tradePCR * tradeO + corpPCR * corpPOS) / (tradeO + corpPOS)
    : tradePCR ?? corpPCR;

  // Blended Credit Cost (exposure-weighted, Consumer + Trade + Corporate)
  const tradeCC = tradeSummary?.creditCost ?? null;
  const corpCC = corporateSummary?.creditCost ?? null;
  const blendedCC = (() => {
    const parts: { rate: number; weight: number }[] = [];
    if (consumerNCL != null) parts.push({ rate: consumerNCL, weight: consumerAum });
    if (tradeCC != null) parts.push({ rate: tradeCC, weight: tradeO });
    if (corpCC != null) parts.push({ rate: corpCC, weight: corpPOS });
    if (parts.length === 0) return null;
    const tw = parts.reduce((s, p) => s + p.weight, 0);
    return tw > 0
      ? parts.reduce((s, p) => s + p.rate * p.weight, 0) / tw
      : parts.reduce((s, p) => s + p.rate, 0) / parts.length;
  })();

  const stagePCR = corporateSummary?.stagePCR;
  const stageCC = corporateSummary?.stageCC;

  const rows: MetricRow[] = [
    {
      label: 'Total Exposure',
      consumer: { value: formatCurrency(consumerAum) },
      trade: { value: formatCurrency(tradeSummary?.totalAUM ?? null) },
      corporate: { value: formatCurrency(corporateSummary?.totalPOS ?? null) },
      total: { value: formatCurrency(totalExposure) },
    },
    {
      label: 'Delinquency',
      consumer: { value: dpd30 != null ? formatPercent(dpd30) : '—', metricKey: 'dpd_30_plus', rawValue: dpd30 ?? undefined },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.stage2Plus3Pct) : '—', metricKey: 'stage_2_3_pct', rawValue: tradeSummary?.stage2Plus3Pct },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.delinquencyRate) : '—', metricKey: 'corp_delinquency_rate', rawValue: corporateSummary?.delinquencyRate },
      total: { value: '—' },
    },
    {
      label: 'Severe',
      consumer: { value: dpd90 != null ? formatPercent(dpd90) : '—', metricKey: 'dpd_90_plus', rawValue: dpd90 ?? undefined },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.nplRatio) : '—', metricKey: 'npl_ratio', rawValue: tradeSummary?.nplRatio },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.npaRate) : '—', metricKey: 'corp_npa_rate', rawValue: corporateSummary?.npaRate },
      total: { value: '—' },
    },
    {
      label: 'Provision Coverage',
      consumer: { value: '—' },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.provisionCoverage) : '—', metricKey: 'trade_provision_coverage', rawValue: tradeSummary?.provisionCoverage },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.provisionCoverageRatio) : '—', metricKey: 'corp_pcr', rawValue: corporateSummary?.provisionCoverageRatio },
      total: { value: blendedPCR != null ? formatPercent(blendedPCR) : '—' },
    },
    {
      label: 'Stage 1',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stagePCR ? formatPercent(stagePCR.stage1) : '—' },
      total: { value: '—' },
    },
    {
      label: 'Stage 2',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stagePCR ? formatPercent(stagePCR.stage2) : '—' },
      total: { value: '—' },
    },
    {
      label: 'Stage 3',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stagePCR ? formatPercent(stagePCR.stage3) : '—' },
      total: { value: '—' },
    },
    {
      label: 'Credit Cost',
      consumer: { value: consumerNCL != null ? formatPercent(consumerNCL) : '—' },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.creditCost) : '—' },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.creditCost) : '—' },
      total: { value: blendedCC != null ? formatPercent(blendedCC) : '—' },
    },
    {
      label: 'Stage 1',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stageCC ? formatPercent(stageCC.stage1) : '—' },
      total: { value: '—' },
    },
    {
      label: 'Stage 2',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stageCC ? formatPercent(stageCC.stage2) : '—' },
      total: { value: '—' },
    },
    {
      label: 'Stage 3',
      indent: true,
      consumer: { value: '—' },
      trade: { value: '—' },
      corporate: { value: stageCC ? formatPercent(stageCC.stage3) : '—' },
      total: { value: '—' },
    },
    {
      label: 'FPD% (Unsecured)',
      consumer: { value: unsecuredFpd != null ? formatPercent(unsecuredFpd) : '—', metricKey: 'fpd_pct', rawValue: unsecuredFpd ?? undefined },
      trade: { value: '—' },
      corporate: { value: '—' },
      total: { value: unsecuredFpd != null ? formatPercent(unsecuredFpd) : '—' },
    },
    {
      label: 'Watchlist',
      consumer: { value: '—' },
      trade: { value: tradeSummary ? formatCurrency(tradeSummary.watchlistExposure) : '—' },
      corporate: { value: corporateSummary ? formatNumber(corporateSummary.watchlistCount) : '—' },
      total: { value: '—' },
    },
  ];

  const headerSx = { fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', '&:hover': { color: 'primary.main' } };
  const cellSx = { fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' };

  const renderCell = (cell: CellData) => {
    if (cell.metricKey && cell.rawValue != null) {
      return (
        <BreachBadge metricKey={cell.metricKey} value={cell.rawValue} context={ctx}>
          <span style={{ color: getColor(cell.metricKey, cell.rawValue, ctx) }}>{cell.value}</span>
        </BreachBadge>
      );
    }
    return cell.value;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
        Business Line Comparison
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Metric</TableCell>
              <TableCell align="right" sx={headerSx} onClick={() => onTabChange?.(1)}>Consumer</TableCell>
              <TableCell align="right" sx={headerSx} onClick={() => onTabChange?.(3)}>Trade</TableCell>
              <TableCell align="right" sx={headerSx} onClick={() => onTabChange?.(2)}>Corporate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={`${row.label}-${idx}`} hover={!row.indent}>
                <TableCell sx={{
                  fontSize: row.indent ? '0.7rem' : '0.75rem',
                  fontWeight: row.indent ? 400 : 600,
                  color: row.indent ? 'text.secondary' : 'text.primary',
                  pl: row.indent ? 4 : 2,
                }}>
                  {row.label}
                </TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.consumer)}</TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.trade)}</TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.corporate)}</TableCell>
                <TableCell align="right" sx={{ ...cellSx, fontWeight: 600 }}>{renderCell(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
