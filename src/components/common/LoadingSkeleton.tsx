'use client';

import { Skeleton, Card, Stack } from '@mui/material';

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card sx={{ p: 2 }}>
      <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card sx={{ p: 2 }}>
      <Skeleton variant="text" width={160} height={20} sx={{ mb: 2 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 0.5, borderRadius: 0.5 }} />
      ))}
    </Card>
  );
}

export function LoadingSkeleton() {
  return (
    <Card sx={{ p: 2 }}>
      <Skeleton variant="text" width={160} height={20} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1, mb: 1 }} />
      <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 0.5, mb: 0.5 }} />
      <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 0.5 }} />
    </Card>
  );
}

export function KPIRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Stack direction="row" spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ p: 2.5, flex: 1, minWidth: 160 }}>
          <Skeleton variant="text" width={80} height={14} />
          <Skeleton variant="text" width={100} height={32} sx={{ mt: 1 }} />
          <Skeleton variant="text" width={60} height={14} sx={{ mt: 0.5 }} />
        </Card>
      ))}
    </Stack>
  );
}
