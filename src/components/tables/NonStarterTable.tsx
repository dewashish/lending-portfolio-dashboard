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
} from '@mui/material';
import { formatNumber, sortPeriodsChronologically } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { AugmentedNonStarterRow } from '@/lib/non-starter-utils';

/* ── helpers ─────────────────────────────────────────────────────── */

function formatNSValue(
  value: number | null | undefined,
  metric: string,
  fmtCurrencyMM: (v: number) => string,
): string {
  if (value == null || isNaN(value as number)) return '—';
  if (/Facility in Force|#/i.test(metric)) return formatNumber(value, 0);
  if (/ENR/i.test(metric)) return fmtCurrencyMM(value);
  return parseFloat(value.toFixed(2)).toString();
}

/* ── component ───────────────────────────────────────────────────── */

interface Props {
  data: AugmentedNonStarterRow[];
  title?: string;
}

export function NonStarterTable({
  data,
  title = 'Non-Starter Analysis',
}: Props) {
  const { formatCurrencyMM } = useCurrencyFormat();
  const [sorting, setSorting] = useState<SortingState>([]);

  /* extract period keys sorted chronologically */
  const monthlyKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    const allKeys = new Set<string>();
    data.forEach((r) => Object.keys(r.monthlyValues).forEach((k) => allKeys.add(k)));
    return sortPeriodsChronologically(Array.from(allKeys));
  }, [data]);

  /* extract yearly avg keys sorted */
  const yearlyKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    const allKeys = new Set<string>();
    data.forEach((r) => Object.keys(r.yearlyAverages).forEach((k) => allKeys.add(k)));
    return Array.from(allKeys).sort();
  }, [data]);

  /* extract quarterly keys sorted */
  const quarterlyKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    const allKeys = new Set<string>();
    data.forEach((r) => Object.keys(r.quarterlyValues).forEach((k) => allKeys.add(k)));
    return Array.from(allKeys).sort((a, b) => {
      const [qa, ya] = a.replace('Q', '').split(' ').map(Number);
      const [qb, yb] = b.replace('Q', '').split(' ').map(Number);
      return ya !== yb ? ya - yb : qa - qb;
    });
  }, [data]);

  /* group rows by product — "Total" product goes last */
  const groups = useMemo(() => {
    const map = new Map<string, AugmentedNonStarterRow[]>();
    data.forEach((row) => {
      const existing = map.get(row.product);
      if (existing) existing.push(row);
      else map.set(row.product, [row]);
    });
    // Move "Total" to end
    const totalGroup = map.get('Total');
    if (totalGroup) {
      map.delete('Total');
      map.set('Total', totalGroup);
    }
    return map;
  }, [data]);

  const flatRows = useMemo(() => Array.from(groups.values()).flat(), [groups]);

  /* columns */
  const columns = useMemo<ColumnDef<AugmentedNonStarterRow, unknown>[]>(() => {
    const cellStyle = { fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' };

    const cols: ColumnDef<AugmentedNonStarterRow, unknown>[] = [
      {
        id: 'product',
        accessorKey: 'product',
        header: 'Product',
        enableSorting: false,
      },
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      /* monthly columns */
      ...monthlyKeys.map<ColumnDef<AugmentedNonStarterRow, unknown>>((key) => ({
        id: `month_${key}`,
        accessorFn: (row: AugmentedNonStarterRow) => row.monthlyValues[key] ?? null,
        header: key,
        cell: (info) => (
          <Box component="span" sx={cellStyle}>
            {formatNSValue(info.getValue() as number | null, info.row.original.metric, formatCurrencyMM)}
          </Box>
        ),
      })),
      /* difference column */
      {
        id: 'difference',
        accessorFn: (row: AugmentedNonStarterRow) => row.difference,
        header: 'Diff',
        cell: (info) => {
          const val = info.getValue() as number | null;
          const color = val != null ? (val > 0 ? 'error.main' : val < 0 ? 'success.main' : 'text.primary') : 'text.disabled';
          return (
            <Box component="span" sx={{ ...cellStyle, color, fontWeight: 600 }}>
              {val != null ? formatNSValue(val, info.row.original.metric, formatCurrencyMM) : '—'}
            </Box>
          );
        },
      },
      /* yearly average columns */
      ...yearlyKeys.map<ColumnDef<AugmentedNonStarterRow, unknown>>((key) => ({
        id: `yearly_${key}`,
        accessorFn: (row: AugmentedNonStarterRow) => row.yearlyAverages[key] ?? null,
        header: key,
        cell: (info) => (
          <Box component="span" sx={{ ...cellStyle, fontStyle: 'italic' }}>
            {formatNSValue(info.getValue() as number | null, info.row.original.metric, formatCurrencyMM)}
          </Box>
        ),
      })),
      /* quarterly columns */
      ...quarterlyKeys.map<ColumnDef<AugmentedNonStarterRow, unknown>>((key) => ({
        id: `quarterly_${key}`,
        accessorFn: (row: AugmentedNonStarterRow) => row.quarterlyValues[key] ?? null,
        header: key,
        cell: (info) => (
          <Box component="span" sx={cellStyle}>
            {formatNSValue(info.getValue() as number | null, info.row.original.metric, formatCurrencyMM)}
          </Box>
        ),
      })),
    ];
    return cols;
  }, [monthlyKeys, yearlyKeys, quarterlyKeys, formatCurrencyMM]);

  const table = useReactTable({
    data: flatRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  let lastProduct = '';

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      {title && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            {title}
          </Typography>
        </Box>
      )}
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  if (header.id === 'product') return null;
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
              const product = row.original.product;
              const showGroupHeader = product !== lastProduct;
              lastProduct = product;

              const isTotal = product === 'Total';
              const colSpan = columns.length - 1;

              return [
                showGroupHeader && (
                  <TableRow key={`group-${product}`}>
                    <TableCell
                      colSpan={colSpan}
                      sx={{
                        bgcolor: isTotal ? 'action.selected' : 'action.hover',
                        borderLeft: '3px solid',
                        borderLeftColor: isTotal ? 'primary.main' : 'secondary.main',
                        py: 0.75,
                        px: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: isTotal ? 'primary.main' : 'secondary.main',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {product}
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
                      fontWeight: isTotal ? 700 : 400,
                    },
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === 'product') return null;
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
