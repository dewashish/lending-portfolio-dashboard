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
} from '@mui/material';
import { formatPercent, formatCurrencyMM } from '@/lib/format';
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

function isPercentMetric(metric: string): boolean {
  return /(%|Rate|Amt%|FPD|SPD|TPD|NPA|Delinquency|Efficiency|Ratio)/i.test(metric);
}

function isCurrencyMetric(metric: string): boolean {
  return /\b(AUM|Bookings|Disbursement|Write-off|Recoveries|NCL|Outstanding|Amount|Balance|POS)\b/i.test(metric);
}

function formatMetricValue(
  value: number | string | null,
  metric: string,
): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (isNaN(value)) return '—';
  if (isPercentMetric(metric)) return formatPercent(value);
  if (isCurrencyMetric(metric) && Math.abs(value) > 1) return formatCurrencyMM(value);
  return String(value);
}

function getValueColor(
  value: number | string | null,
  benchmark: number | string | null,
  metric: string,
): string | undefined {
  if (
    value == null ||
    benchmark == null ||
    typeof value === 'string' ||
    typeof benchmark === 'string'
  )
    return undefined;

  if (isPercentMetric(metric)) {
    if (value > benchmark * 1.05) return '#ef5350';
    if (value < benchmark * 0.95) return '#66bb6a';
  }
  return undefined;
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

  /* resolve the active product */
  const activeProduct = selectedProduct ?? internalProduct;

  const productData = useMemo<ConsumerMetricRow[]>(() => {
    const match = data.find((p) => p.productName === activeProduct);
    return match?.metrics ?? data[0]?.metrics ?? [];
  }, [data, activeProduct]);

  /* dynamically extract period column keys */
  const periodKeys = useMemo<string[]>(() => {
    if (productData.length === 0) return [];
    return Object.keys(productData[0].values);
  }, [productData]);

  /* group rows by metricType */
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

  /* columns */
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
          const color = getValueColor(raw, row.benchmark, row.metric);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                color: color ?? 'text.primary',
                fontWeight: color ? 700 : 400,
              }}
            >
              {formatMetricValue(raw, row.metric)}
            </Box>
          );
        },
      })),
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
  }, [periodKeys]);

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

        {/* product selector */}
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
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        bgcolor: 'background.paper',
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
                    return (
                      <TableCell key={cell.id}>
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
