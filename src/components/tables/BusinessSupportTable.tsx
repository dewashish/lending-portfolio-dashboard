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
  Stack,
} from '@mui/material';
import { formatNumber } from '@/lib/format';
import type { ApprovedBaseRow, RejectedBaseRow } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────── */

/** Compute column-level max values for heatmap intensity */
function computeColumnMaxes<T>(
  data: T[],
  keys: string[],
  accessor: (row: T, key: string) => number,
): Record<string, number> {
  const maxes: Record<string, number> = {};
  keys.forEach((key) => {
    let max = 0;
    data.forEach((row) => {
      const v = accessor(row, key);
      if (v > max) max = v;
    });
    maxes[key] = max;
  });
  return maxes;
}

function heatmapBgColor(value: number, max: number): string | undefined {
  if (max === 0 || value === 0) return undefined;
  const intensity = Math.min(value / max, 1);
  // Use a blue-tinted heatmap: rgba(25, 118, 210, opacity)
  const alpha = (intensity * 0.35).toFixed(2);
  return `rgba(25, 118, 210, ${alpha})`;
}

/* ── Approved Base sub-table ─────────────────────────────────────── */

function ApprovedBaseTable({ data }: { data: ApprovedBaseRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const bandKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].loanBands);
  }, [data]);

  const allKeys = useMemo(() => [...bandKeys, 'total'], [bandKeys]);

  const columnMaxes = useMemo(
    () =>
      computeColumnMaxes(
        data,
        allKeys,
        (row, key) => (key === 'total' ? row.total : (row.loanBands[key] ?? 0)),
      ),
    [data, allKeys],
  );

  const columns = useMemo<ColumnDef<ApprovedBaseRow, unknown>[]>(() => {
    const cols: ColumnDef<ApprovedBaseRow, unknown>[] = [
      {
        id: 'laBand',
        accessorKey: 'laBand',
        header: 'LA Band',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      ...bandKeys.map<ColumnDef<ApprovedBaseRow, unknown>>((key) => ({
        id: `band_${key}`,
        accessorFn: (row: ApprovedBaseRow) => row.loanBands[key] ?? 0,
        header: key,
        cell: (info) => {
          const val = info.getValue() as number;
          const bg = heatmapBgColor(val, columnMaxes[key] ?? 1);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                display: 'inline-block',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: bg,
              }}
            >
              {formatNumber(val)}
            </Box>
          );
        },
      })),
      {
        id: 'total',
        accessorKey: 'total',
        header: 'Total',
        cell: (info) => {
          const val = info.getValue() as number;
          const bg = heatmapBgColor(val, columnMaxes['total'] ?? 1);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-block',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: bg,
              }}
            >
              {formatNumber(val)}
            </Box>
          );
        },
      },
    ];
    return cols;
  }, [bandKeys, columnMaxes]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
          Approved Base
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
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
            {table.getRowModel().rows.map((row) => (
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

/* ── Rejected Base sub-table ─────────────────────────────────────── */

function RejectedBaseTable({ data }: { data: RejectedBaseRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const bandKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].amountBands);
  }, [data]);

  const allKeys = useMemo(() => [...bandKeys, 'total'], [bandKeys]);

  const columnMaxes = useMemo(
    () =>
      computeColumnMaxes(
        data,
        allKeys,
        (row, key) => (key === 'total' ? row.total : (row.amountBands[key] ?? 0)),
      ),
    [data, allKeys],
  );

  const columns = useMemo<ColumnDef<RejectedBaseRow, unknown>[]>(() => {
    const cols: ColumnDef<RejectedBaseRow, unknown>[] = [
      {
        id: 'loanType',
        accessorKey: 'loanType',
        header: 'Loan Type',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      ...bandKeys.map<ColumnDef<RejectedBaseRow, unknown>>((key) => ({
        id: `band_${key}`,
        accessorFn: (row: RejectedBaseRow) => row.amountBands[key] ?? 0,
        header: key,
        cell: (info) => {
          const val = info.getValue() as number;
          const bg = heatmapBgColor(val, columnMaxes[key] ?? 1);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                display: 'inline-block',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: bg,
              }}
            >
              {formatNumber(val)}
            </Box>
          );
        },
      })),
      {
        id: 'total',
        accessorKey: 'total',
        header: 'Total',
        cell: (info) => {
          const val = info.getValue() as number;
          const bg = heatmapBgColor(val, columnMaxes['total'] ?? 1);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-block',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: bg,
              }}
            >
              {formatNumber(val)}
            </Box>
          );
        },
      },
    ];
    return cols;
  }, [bandKeys, columnMaxes]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
          Rejected Base
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
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
            {table.getRowModel().rows.map((row) => (
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

/* ── Main BusinessSupportTable component ─────────────────────────── */

interface Props {
  approvedData: ApprovedBaseRow[];
  rejectedData: RejectedBaseRow[];
}

export function BusinessSupportTable({ approvedData, rejectedData }: Props) {
  return (
    <Stack spacing={3}>
      <ApprovedBaseTable data={approvedData} />
      <RejectedBaseTable data={rejectedData} />
    </Stack>
  );
}
