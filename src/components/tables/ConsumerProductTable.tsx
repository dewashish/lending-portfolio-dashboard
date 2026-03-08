'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Typography,
  Box,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { formatPercent, formatCurrency } from '@/lib/format';
import type { ConsumerProductData, ConsumerMetricRow } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────── */

const GROUP_COLORS: Record<string, string> = {
  'Asset Quality': '#1565c0',
  'Collection': '#2e7d32',
  'Delinquency': '#e65100',
  'Write-off': '#b71c1c',
  'Recovery': '#00695c',
  'Portfolio': '#4527a0',
  'Bookings': '#0d47a1',
};

function isInverseMetric(metric: string): boolean {
  return /(%|FPD|SPD|TPD|NPA|DPD|Delinquency|Write-off|NCL|Net Credit Loss)/i.test(metric);
}

function isPercentMetric(metric: string): boolean {
  return /(%|Rate|Amt%|FPD|SPD|TPD|NPA|Delinquency|Efficiency|Ratio|ROI|Credit Loss|Bounce)/i.test(metric);
}

function isCurrencyMetric(metric: string): boolean {
  return /\b(AUM|Bookings|Disbursement|Write-offs?|Recoveries|NCL|Outstanding|Amount|Balance|POS)\b/i.test(metric);
}

function formatMetricValue(
  value: number | string | null,
  metric: string,
): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (isNaN(value)) return '—';
  if (isPercentMetric(metric)) return formatPercent(value);
  if (isCurrencyMetric(metric) && Math.abs(value) > 1) return formatCurrency(value);
  return parseFloat(value.toFixed(2)).toString();
}

/** Heatmap color based on where value sits in the min-max range for a metric row */
function getHeatmapBg(
  value: number | string | null,
  allValues: (number | string | null)[],
  metric: string,
): string | undefined {
  if (typeof value !== 'number') return undefined;
  const nums = allValues.filter((v): v is number => typeof v === 'number');
  if (nums.length < 2) return undefined;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max === min) return undefined;

  const ratio = (value - min) / (max - min); // 0 = lowest, 1 = highest

  if (isInverseMetric(metric)) {
    // For delinquency: low (green) → high (red)
    if (ratio <= 0.3) return 'rgba(102,187,106,0.12)';
    if (ratio >= 0.7) return 'rgba(239,83,80,0.12)';
    return 'rgba(255,167,38,0.08)';
  }
  // For positive metrics: high (green) → low (red)
  if (ratio >= 0.7) return 'rgba(102,187,106,0.12)';
  if (ratio <= 0.3) return 'rgba(239,83,80,0.12)';
  return 'rgba(255,167,38,0.08)';
}

function getMoMDelta(row: ConsumerMetricRow, periodKeys: string[]): { value: number; pct: number } | null {
  if (periodKeys.length < 2) return null;
  const curr = row.values[periodKeys[periodKeys.length - 1]];
  const prev = row.values[periodKeys[periodKeys.length - 2]];
  if (typeof curr !== 'number' || typeof prev !== 'number') return null;
  if (prev === 0) return { value: curr - prev, pct: 0 };
  return { value: curr - prev, pct: ((curr - prev) / Math.abs(prev)) * 100 };
}

/* ── component ───────────────────────────────────────────────────── */

interface Props {
  data: ConsumerProductData[];
  selectedProduct?: string;
}

export function ConsumerProductTable({ data, selectedProduct }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalProduct, setInternalProduct] = useState<string>(
    selectedProduct ?? data[0]?.productName ?? '',
  );

  const activeProduct = selectedProduct ?? internalProduct;

  const productData = useMemo<ConsumerMetricRow[]>(() => {
    const match = data.find((p) => p.productName === activeProduct);
    return match?.metrics ?? data[0]?.metrics ?? [];
  }, [data, activeProduct]);

  const periodKeys = useMemo<string[]>(() => {
    if (productData.length === 0) return [];
    return Object.keys(productData[0].values).sort();
  }, [productData]);

  const latestPeriodKey = periodKeys.length > 0 ? periodKeys[periodKeys.length - 1] : '';

  const groups = useMemo(() => {
    const map = new Map<string, ConsumerMetricRow[]>();
    productData.forEach((row) => {
      const existing = map.get(row.metricType);
      if (existing) existing.push(row);
      else map.set(row.metricType, [row]);
    });
    return map;
  }, [productData]);

  const flatRows = useMemo(() => Array.from(groups.values()).flat(), [groups]);

  const columns = useMemo<ColumnDef<ConsumerMetricRow, unknown>[]>(() => {
    const cols: ColumnDef<ConsumerMetricRow, unknown>[] = [
      {
        id: 'metricType',
        accessorKey: 'metricType',
        header: 'Metric Type',
        enableSorting: false,
      },
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      ...periodKeys.map<ColumnDef<ConsumerMetricRow, unknown>>((key) => ({
        id: `period_${key}`,
        accessorFn: (row: ConsumerMetricRow) => row.values[key] ?? null,
        header: key,
        cell: (info) => {
          const row = info.row.original;
          const raw = row.values[key];
          const allVals = periodKeys.map((pk) => row.values[pk]);
          const heatBg = getHeatmapBg(raw, allVals, row.metric);
          const isLatest = key === latestPeriodKey;
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                fontWeight: isLatest ? 700 : 400,
                display: 'inline-block',
                px: 0.5,
                py: 0.15,
                borderRadius: 0.5,
                bgcolor: heatBg,
              }}
            >
              {formatMetricValue(raw, row.metric)}
            </Box>
          );
        },
      })),
      // MoM Delta column
      {
        id: 'mom_delta',
        header: 'MoM',
        accessorFn: (row: ConsumerMetricRow) => {
          const delta = getMoMDelta(row, periodKeys);
          return delta?.pct ?? 0;
        },
        cell: (info) => {
          const row = info.row.original;
          const delta = getMoMDelta(row, periodKeys);
          if (!delta) return <Box component="span" sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>—</Box>;

          const isFlat = Math.abs(delta.pct) < 0.5;
          const inverse = isInverseMetric(row.metric);
          const isGood = isFlat ? null : inverse ? delta.pct < 0 : delta.pct > 0;
          const color = isFlat ? '#78909c' : isGood ? '#66bb6a' : '#ef5350';
          const Icon = isFlat ? TrendingFlatIcon : delta.pct > 0 ? TrendingUpIcon : TrendingDownIcon;

          return (
            <Tooltip
              title={`${delta.pct >= 0 ? '+' : ''}${formatPercent(delta.pct, 1)} (${formatMetricValue(delta.value, row.metric)})`}
              arrow
              placement="top"
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.3,
                  bgcolor: `${color}18`,
                  borderRadius: 0.5,
                  px: 0.5,
                  py: 0.15,
                  cursor: 'default',
                }}
              >
                <Icon sx={{ fontSize: 11, color }} />
                <Typography
                  component="span"
                  sx={{ fontSize: '0.65rem', fontWeight: 700, color, lineHeight: 1 }}
                >
                  {formatPercent(Math.abs(delta.pct), 1)}
                </Typography>
              </Box>
            </Tooltip>
          );
        },
      },
      // Benchmark
      {
        id: 'benchmark',
        accessorKey: 'benchmark',
        header: 'Benchmark',
        cell: (info) => {
          const row = info.row.original;
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              {formatMetricValue(row.benchmark, row.metric)}
            </Box>
          );
        },
      },
    ];
    return cols;
  }, [periodKeys, latestPeriodKey]);

  const table = useReactTable({
    data: flatRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  let lastGroupKey = '';

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
          Product Metrics — {activeProduct}
        </Typography>

        {!selectedProduct && data.length > 1 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={internalProduct}
            onChange={(_, val) => {
              if (val !== null) setInternalProduct(val);
            }}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontSize: '0.7rem',
                px: 1.5,
                py: 0.25,
              },
            }}
          >
            {data.map((p) => (
              <ToggleButton key={p.productName} value={p.productName}>
                {p.productName}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  if (header.id === 'metricType') return null;
                  const isLatestPeriod = header.id === `period_${latestPeriodKey}`;
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        bgcolor: isLatestPeriod ? 'action.selected' : 'background.paper',
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        borderBottom: 1,
                        borderColor: 'divider',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        ...(header.id === 'mom_delta' && { width: 70 }),
                      }}
                      sortDirection={sorted || undefined}
                    >
                      {canSort ? (
                        <TableSortLabel
                          active={!!sorted}
                          direction={sorted === 'desc' ? 'desc' : 'asc'}
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            color: 'text.secondary',
                            '& .MuiTableSortLabel-icon': { color: 'text.disabled' },
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableSortLabel>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const groupKey = row.original.metricType;
              const showGroupHeader = groupKey !== lastGroupKey;
              lastGroupKey = groupKey;

              const groupColor =
                GROUP_COLORS[groupKey] ??
                GROUP_COLORS[
                  Object.keys(GROUP_COLORS).find((k) =>
                    groupKey.toLowerCase().includes(k.toLowerCase()),
                  ) ?? ''
                ] ??
                '#546e7a';

              const colSpan = columns.length - 1;

              return [
                showGroupHeader && (
                  <TableRow key={`group-${groupKey}`}>
                    <TableCell
                      colSpan={colSpan}
                      sx={{
                        bgcolor: `${groupColor}14`,
                        borderLeft: `3px solid ${groupColor}`,
                        py: 0.75,
                        px: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: groupColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {groupKey}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ),
                <TableRow
                  key={row.id}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    '& td': {
                      borderBottom: 1,
                      borderColor: 'divider',
                      fontSize: '0.75rem',
                      color: 'text.primary',
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'metricType') return null;
                    const isLatestPeriod = cell.column.id === `period_${latestPeriodKey}`;
                    return (
                      <TableCell
                        key={cell.id}
                        sx={{
                          ...(isLatestPeriod && { bgcolor: 'action.selected' }),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>,
              ];
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
