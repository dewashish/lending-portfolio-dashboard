'use client';

import { Skeleton, Card, Stack, Box, Grid } from '@mui/material';

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card sx={{ p: 2 }}>
      <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} animation="wave" />
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card sx={{ p: 2 }}>
      <Skeleton variant="text" width={160} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={28} sx={{ mb: 1, borderRadius: 0.5, opacity: 0.7 }} animation="wave" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 0.5, borderRadius: 0.5 }} animation="wave" />
      ))}
    </Card>
  );
}

export function LoadingSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* KPI strip skeleton */}
      <Stack direction="row" spacing={1.5}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} sx={{ flex: 1, p: 1.5 }}>
            <Skeleton variant="text" width={60} height={12} animation="wave" />
            <Skeleton variant="text" width={80} height={24} sx={{ mt: 0.5 }} animation="wave" />
            <Skeleton variant="text" width={50} height={12} sx={{ mt: 0.3 }} animation="wave" />
          </Card>
        ))}
      </Stack>
      {/* Table skeleton */}
      <TableSkeleton rows={6} />
    </Box>
  );
}

export function KPIRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Stack direction="row" spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ p: 2, flex: 1, minWidth: 155 }}>
          <Skeleton variant="text" width={70} height={12} animation="wave" />
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 1 }}>
            <Skeleton variant="text" width={80} height={28} animation="wave" />
            <Skeleton variant="rectangular" width={72} height={24} sx={{ borderRadius: 0.5 }} animation="wave" />
          </Stack>
          <Skeleton variant="text" width={55} height={14} sx={{ mt: 0.5 }} animation="wave" />
        </Card>
      ))}
    </Stack>
  );
}

/** Skeleton matching the Overview section layout: KPI strip + table + chart */
export function OverviewSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Stack direction="row" sx={{ px: 1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ flex: 1, py: 1.5, px: 1.5, textAlign: 'center' }}>
              <Skeleton variant="text" width={50} height={10} sx={{ mx: 'auto' }} animation="wave" />
              <Skeleton variant="text" width={70} height={22} sx={{ mx: 'auto', mt: 0.5 }} animation="wave" />
              <Skeleton variant="text" width={60} height={16} sx={{ mx: 'auto', mt: 0.3 }} animation="wave" />
            </Box>
          ))}
        </Stack>
      </Card>
      <TableSkeleton rows={8} />
      <ChartSkeleton height={280} />
    </Box>
  );
}

/** Skeleton matching chart-heavy layouts (Delinquency, Origination) */
export function ChartGridSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Stack direction="row" spacing={1.5}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} sx={{ flex: 1, p: 1.5 }}>
            <Skeleton variant="text" width={60} height={12} animation="wave" />
            <Skeleton variant="text" width={80} height={24} sx={{ mt: 0.5 }} animation="wave" />
          </Card>
        ))}
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartSkeleton height={250} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartSkeleton height={250} />
        </Grid>
      </Grid>
    </Box>
  );
}
