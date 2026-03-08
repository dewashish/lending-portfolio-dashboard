'use client';

import { Card, Typography, Box, Skeleton } from '@mui/material';

interface Props {
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartContainer({ title, subtitle, height = 320, loading, empty, headerRight, children }: Props) {
  return (
    <Card sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {headerRight}
      </Box>
      <Box sx={{ flex: 1, minHeight: height, position: 'relative' }}>
        {loading ? (
          <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
        ) : empty ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
            <Typography variant="caption" color="text.secondary">No data</Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Card>
  );
}
