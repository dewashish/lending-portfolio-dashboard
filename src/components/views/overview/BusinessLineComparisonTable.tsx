'use client';

import {
  Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import type { ConsumerMetricRow, PortfolioSummary, CorporatePortfolioSummary } from '@/lib/types';

interface Props {
  consumerOverall: ConsumerMetricRow[];
  tradeSummary: PortfolioSummary | null;
  corporateSummary: CorporatePortfolioSummary | null;
  consumerAum: number;
  onTabChange?: (tabIndex: number) => void;
}

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find(d => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

interface MetricRow {
  label: string;
  consumer: { value: string; metricKey?: string; rawValue?: number };
  trade: { value: string; metricKey?: string; rawValue?: number };
  corporate: { value: string; metricKey?: string; rawValue?: number };
}

export function BusinessLineComparisonTable({
  consumerOverall,
  tradeSummary,
  corporateSummary,
  consumerAum,
  onTabChange,
}: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { getColor } = useRiskAppetite();

  const dpd30 = getLatest(consumerOverall, '30+ Amt%');
  const dpd90 = getLatest(consumerOverall, '90+ Amt%');

  const rows: MetricRow[] = [
    {
      label: 'Total Exposure',
      consumer: { value: formatCurrency(consumerAum) },
      trade: { value: formatCurrency(tradeSummary?.totalAUM ?? null) },
      corporate: { value: formatCurrency(corporateSummary?.totalPOS ?? null) },
    },
    {
      label: 'Delinquency',
      consumer: { value: dpd30 != null ? formatPercent(dpd30) : '—', metricKey: 'dpd_30_plus', rawValue: dpd30 ?? undefined },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.stage2Plus3Pct) : '—', metricKey: 'stage_2_3_pct', rawValue: tradeSummary?.stage2Plus3Pct },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.delinquencyRate) : '—', metricKey: 'corp_delinquency_rate', rawValue: corporateSummary?.delinquencyRate },
    },
    {
      label: 'Severe',
      consumer: { value: dpd90 != null ? formatPercent(dpd90) : '—', metricKey: 'dpd_90_plus', rawValue: dpd90 ?? undefined },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.nplRatio) : '—', metricKey: 'npl_ratio', rawValue: tradeSummary?.nplRatio },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.npaRate) : '—', metricKey: 'corp_npa_rate', rawValue: corporateSummary?.npaRate },
    },
    {
      label: 'Provision Coverage',
      consumer: { value: '—' },
      trade: { value: tradeSummary ? formatPercent(tradeSummary.provisionCoverage) : '—', metricKey: 'trade_provision_coverage', rawValue: tradeSummary?.provisionCoverage },
      corporate: { value: corporateSummary ? formatPercent(corporateSummary.provisionCoverageRatio) : '—', metricKey: 'corp_pcr', rawValue: corporateSummary?.provisionCoverageRatio },
    },
    {
      label: 'Watchlist',
      consumer: { value: '—' },
      trade: { value: tradeSummary ? formatCurrency(tradeSummary.watchlistExposure) : '—' },
      corporate: { value: corporateSummary ? formatNumber(corporateSummary.watchlistCount) : '—' },
    },
  ];

  const headerSx = { fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', '&:hover': { color: 'primary.main' } };
  const cellSx = { fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' };

  const renderCell = (cell: { value: string; metricKey?: string; rawValue?: number }) => {
    if (cell.metricKey && cell.rawValue != null) {
      return (
        <BreachBadge metricKey={cell.metricKey} value={cell.rawValue}>
          <span style={{ color: getColor(cell.metricKey, cell.rawValue) }}>{cell.value}</span>
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
              <TableCell align="right" sx={headerSx} onClick={() => onTabChange?.(2)}>Trade</TableCell>
              <TableCell align="right" sx={headerSx} onClick={() => onTabChange?.(3)}>Corporate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label} hover>
                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.label}</TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.consumer)}</TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.trade)}</TableCell>
                <TableCell align="right" sx={cellSx}>{renderCell(row.corporate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
