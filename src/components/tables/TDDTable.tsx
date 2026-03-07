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
import { formatPercent } from '@/lib/format';
import type { TDDPreDisbursal, TDDPostDisbursal } from '@/lib/types';

/* ── Pre-Disbursal Table ─────────────────────────────────────────── */

function TDDPreTable({ data, title }: { data: TDDPreDisbursal[]; title: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const periodKeys = useMemo<string[]>(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].values);
  }, [data]);

  const columns = useMemo<ColumnDef<TDDPreDisbursal, unknown>[]>(() => {
    const cols: ColumnDef<TDDPreDisbursal, unknown>[] = [
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric / Bureau Band',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      ...periodKeys.map<ColumnDef<TDDPreDisbursal, unknown>>((key) => ({
        id: `period_${key}`,
        accessorFn: (row: TDDPreDisbursal) => row.values[key] ?? null,
        header: key,
        cell: (info) => {
          const val = info.getValue();
          if (val == null) return '—';
          if (typeof val === 'string') return val;
          return (
            <Box
              component="span"
              sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
            >
              {formatPercent(val as number)}
            </Box>
          );
        },
      })),
    ];
    return cols;
  }, [periodKeys]);

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
          {title}
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 480 }}>
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

/* ── Post-Disbursal Table ────────────────────────────────────────── */

function TDDPostTable({ data, title }: { data: TDDPostDisbursal[]; title: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  /* extract unique variants for the toggle selector */
  const variants = useMemo<string[]>(() => {
    const set = new Set<string>();
    data.forEach((row) => set.add(row.variant));
    return Array.from(set);
  }, [data]);

  const [selectedVariant, setSelectedVariant] = useState<string>(variants[0] ?? '');

  const filtered = useMemo(
    () => data.filter((row) => row.variant === selectedVariant),
    [data, selectedVariant],
  );

  const periodKeys = useMemo<string[]>(() => {
    if (filtered.length === 0) return [];
    return Object.keys(filtered[0].values);
  }, [filtered]);

  const columns = useMemo<ColumnDef<TDDPostDisbursal, unknown>[]>(() => {
    const cols: ColumnDef<TDDPostDisbursal, unknown>[] = [
      {
        id: 'bureauBucket',
        accessorKey: 'bureauBucket',
        header: 'Bureau Bucket',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      ...periodKeys.map<ColumnDef<TDDPostDisbursal, unknown>>((key) => ({
        id: `period_${key}`,
        accessorFn: (row: TDDPostDisbursal) => row.values[key] ?? null,
        header: key,
        cell: (info) => {
          const val = info.getValue() as number | null;
          return (
            <Box
              component="span"
              sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
            >
              {val != null ? formatPercent(val) : '—'}
            </Box>
          );
        },
      })),
    ];
    return cols;
  }, [periodKeys]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
          {title}
        </Typography>

        {variants.length > 1 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={selectedVariant}
            onChange={(_, val) => {
              if (val !== null) setSelectedVariant(val);
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
            {variants.map((v) => (
              <ToggleButton key={v} value={v}>
                {v}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      <TableContainer sx={{ maxHeight: 480 }}>
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

/* ── Main TDDTable component ─────────────────────────────────────── */

interface Props {
  data: TDDPreDisbursal[] | TDDPostDisbursal[];
  variant?: 'pre' | 'post';
  title?: string;
}

export function TDDTable({
  data,
  variant = 'pre',
  title,
}: Props) {
  if (variant === 'pre') {
    return (
      <TDDPreTable
        data={data as TDDPreDisbursal[]}
        title={title ?? 'TDD — Pre-Disbursal Distribution'}
      />
    );
  }

  return (
    <TDDPostTable
      data={data as TDDPostDisbursal[]}
      title={title ?? 'TDD — Post-Disbursal Distribution'}
    />
  );
}
