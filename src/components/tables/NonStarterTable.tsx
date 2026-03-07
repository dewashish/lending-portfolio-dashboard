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
import { formatPercent, formatCurrencyMM, formatNumber } from '@/lib/format';
import type { NonStarterRow } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────── */

function formatNonStarterValue(value: number | null | undefined, metric: string): string {
  if (value == null || isNaN(value as number)) return '—';
  if (/%/.test(metric)) return formatPercent(value);
  if (/Count|#/i.test(metric)) return formatNumber(value, 0);
  if (/Amount|\$/i.test(metric)) return formatCurrencyMM(value);
  if (/DPD/i.test(metric)) return formatNumber(value, 0);
  return String(value);
}

/* ── component ───────────────────────────────────────────────────── */

interface Props {
  data: NonStarterRow[];
  title?: string;
}

export function NonStarterTable({
  data,
  title = 'Non-Starter Analysis',
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  /* dynamically extract period column keys from monthlyValues of the first row */
  const monthlyKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].monthlyValues);
  }, [data]);

  /* group rows by product */
  const groups = useMemo(() => {
    const map = new Map<string, NonStarterRow[]>();
    data.forEach((row) => {
      const existing = map.get(row.product);
      if (existing) existing.push(row);
      else map.set(row.product, [row]);
    });
    return map;
  }, [data]);

  const flatRows = useMemo(() => Array.from(groups.values()).flat(), [groups]);

  /* columns */
  const columns = useMemo<ColumnDef<NonStarterRow, unknown>[]>(() => {
    const cols: ColumnDef<NonStarterRow, unknown>[] = [
      {
        id: 'product',
        accessorKey: 'product',
        header: 'Product',
        enableSorting: false,
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
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
      /* dynamic monthly value columns */
      ...monthlyKeys.map<ColumnDef<NonStarterRow, unknown>>((key) => ({
        id: `month_${key}`,
        accessorFn: (row: NonStarterRow) => row.monthlyValues[key] ?? null,
        header: key,
        cell: (info) => {
          const row = info.row.original;
          const val = info.getValue() as number | null;
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
              }}
            >
              {formatNonStarterValue(val, row.metric)}
            </Box>
          );
        },
      })),
    ];
    return cols;
  }, [monthlyKeys]);

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
      <TableContainer sx={{ maxHeight: 560 }}>
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

              const colSpan = columns.length - 1;

              return [
                showGroupHeader && (
                  <TableRow key={`group-${product}`}>
                    <TableCell
                      colSpan={colSpan}
                      sx={{
                        bgcolor: 'action.hover',
                        borderLeft: '3px solid',
                        borderLeftColor: 'secondary.main',
                        py: 0.75,
                        px: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: 'secondary.main',
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
