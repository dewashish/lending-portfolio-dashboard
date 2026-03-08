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
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import type { LOSComparisonMetric } from '@/lib/types';

/* ── helpers ─────────────────────────────────────────────────────── */

/** For TAT metrics, lower is better — reverse color logic */
function isTATMetric(metric: string): boolean {
  return /TAT/i.test(metric);
}

function formatLosValue(value: number | null, fmtCurrencyMM: (v: number) => string): string {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) > 1) return fmtCurrencyMM(value);
  return parseFloat(value.toFixed(2)).toString();
}

function momChangeColor(value: number, metric: string): string {
  if (value === 0) return 'text.secondary';
  const lowerIsBetter = isTATMetric(metric);
  if (lowerIsBetter) {
    // For TAT: negative change (decrease) is good, positive is bad
    return value < 0 ? '#66bb6a' : '#ef5350';
  }
  // For most metrics: positive change is good, negative is bad
  return value > 0 ? '#66bb6a' : '#ef5350';
}

/* ── component ───────────────────────────────────────────────────── */

interface Props {
  data: LOSComparisonMetric[];
  title?: string;
}

export function LOSComparisonTable({
  data,
  title = 'LOS Comparison — MTD vs Targets',
}: Props) {
  const { formatCurrencyMM } = useCurrencyFormat();
  const { getColor } = useRiskAppetite();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<LOSComparisonMetric, unknown>[]>(() => {
    const cols: ColumnDef<LOSComparisonMetric, unknown>[] = [
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
      {
        id: 'product',
        accessorKey: 'product',
        header: 'Product',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {info.getValue() as string}
          </Typography>
        ),
      },
      {
        id: 'ftd',
        accessorKey: 'ftd',
        header: 'FTD',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatLosValue(info.getValue() as number, formatCurrencyMM)}
          </Box>
        ),
      },
      {
        id: 'mtd',
        accessorKey: 'mtd',
        header: 'MTD',
        cell: (info) => (
          <Box
            component="span"
            sx={{
              fontFamily: '"Roboto Mono", monospace',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {formatLosValue(info.getValue() as number, formatCurrencyMM)}
          </Box>
        ),
      },
      {
        id: 'lmtd',
        accessorKey: 'lmtd',
        header: 'LMTD',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatLosValue(info.getValue() as number, formatCurrencyMM)}
          </Box>
        ),
      },
      {
        id: 'lmFull',
        accessorKey: 'lmFull',
        header: 'LM Full',
        cell: (info) => (
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}
          >
            {formatLosValue(info.getValue() as number, formatCurrencyMM)}
          </Box>
        ),
      },
      {
        id: 'momChange',
        accessorKey: 'momChange',
        header: 'MoM \u0394%',
        cell: (info) => {
          const val = info.getValue() as number;
          const row = info.row.original;
          const color = momChangeColor(val, row.metric);
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
                color,
              }}
            >
              {val > 0 ? '+' : ''}
              {formatPercent(val)}
            </Box>
          );
        },
      },
      {
        id: 'target',
        accessorKey: 'target',
        header: 'Target',
        cell: (info) => {
          const val = info.getValue() as number | null;
          return (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              {val != null ? formatLosValue(val, formatCurrencyMM) : '—'}
            </Box>
          );
        },
      },
      {
        id: 'achievement',
        accessorKey: 'achievement',
        header: 'Achievement %',
        cell: (info) => {
          const val = info.getValue() as number | null;
          const color = val != null ? getColor('los_achievement', val) : 'text.secondary';
          const bg = val != null ? `${getColor('los_achievement', val)}18` : undefined;
          const content = (
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
                color,
                display: 'inline-block',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: bg,
              }}
            >
              {val != null ? formatPercent(val) : '—'}
            </Box>
          );
          return val != null ? (
            <BreachBadge metricKey="los_achievement" value={val}>{content}</BreachBadge>
          ) : content;
        },
      },
    ];
    return cols;
  }, [getColor, formatCurrencyMM]);

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
