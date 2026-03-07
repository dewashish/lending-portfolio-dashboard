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
import { formatPercent, formatCurrencyMM } from '@/lib/format';
import type { CollectionMetricRow } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────── */

function rollForwardColor(value: number | null): string | undefined {
  if (value == null) return undefined;
  if (value > 0.3) return '#c62828'; // deep red
  if (value > 0.2) return '#e53935'; // red
  if (value > 0.1) return '#ff7043'; // orange
  if (value > 0.05) return '#ffa726'; // light orange
  return undefined;
}

function rollBackwardColor(value: number | null): string | undefined {
  if (value == null) return undefined;
  if (value > 0.3) return '#2e7d32'; // deep green
  if (value > 0.2) return '#43a047'; // green
  if (value > 0.1) return '#66bb6a'; // light green
  if (value > 0.05) return '#a5d6a7'; // pale green
  return undefined;
}

/* ── component ───────────────────────────────────────────────────── */

interface Props {
  data: CollectionMetricRow[];
  title?: string;
}

export function CollectionMetricsTable({
  data,
  title = 'Collection & Roll-Rate Metrics',
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  /* group rows by portfolio */
  const groups = useMemo(() => {
    const map = new Map<string, CollectionMetricRow[]>();
    data.forEach((row) => {
      const existing = map.get(row.portfolio);
      if (existing) existing.push(row);
      else map.set(row.portfolio, [row]);
    });
    return map;
  }, [data]);

  const flatRows = useMemo(() => Array.from(groups.values()).flat(), [groups]);

  const columns = useMemo<ColumnDef<CollectionMetricRow, unknown>[]>(() => {
    const cols: ColumnDef<CollectionMetricRow, unknown>[] = [
      {
        id: 'portfolio',
        accessorKey: 'portfolio',
        header: 'Portfolio',
        enableSorting: false,
      },
      {
        id: 'bucket',
        accessorKey: 'bucket',
        header: 'Bucket',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatCurrencyMM(info.getValue() as number)}
          </Box>
        ),
      },
      {
        id: 'transitions',
        accessorKey: 'transitions',
        header: 'Transitions',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatPercent(info.getValue() as number)}
          </Box>
        ),
      },
      {
        id: 'normalized',
        accessorKey: 'normalized',
        header: 'Normalized',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatPercent(info.getValue() as number | null)}
          </Box>
        ),
      },
      {
        id: 'rollBackward',
        accessorKey: 'rollBackward',
        header: 'Roll Backward',
        cell: (info) => {
          const val = info.getValue() as number | null;
          const color = rollBackwardColor(val);
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
              {formatPercent(val)}
            </Box>
          );
        },
      },
      {
        id: 'stabilized',
        accessorKey: 'stabilized',
        header: 'Stabilized',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatPercent(info.getValue() as number | null)}
          </Box>
        ),
      },
      {
        id: 'rollForward',
        accessorKey: 'rollForward',
        header: 'Roll Forward',
        cell: (info) => {
          const val = info.getValue() as number | null;
          const color = rollForwardColor(val);
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
              {formatPercent(val)}
            </Box>
          );
        },
      },
    ];
    return cols;
  }, []);

  const table = useReactTable({
    data: flatRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  let lastPortfolio = '';

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      {title && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            {title}
          </Typography>
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  if (header.id === 'portfolio') return null;
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
              const portfolio = row.original.portfolio;
              const showGroupHeader = portfolio !== lastPortfolio;
              lastPortfolio = portfolio;

              const colSpan = columns.length - 1;

              return [
                showGroupHeader && (
                  <TableRow key={`group-${portfolio}`}>
                    <TableCell
                      colSpan={colSpan}
                      sx={{
                        bgcolor: 'action.hover',
                        borderLeft: '3px solid',
                        borderLeftColor: 'primary.main',
                        py: 0.75,
                        px: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: 'primary.main',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {portfolio}
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
                    if (cell.column.id === 'portfolio') return null;
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
