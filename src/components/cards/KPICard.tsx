'use client';

import { Card, Typography, Box, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: string;
  icon?: React.ReactNode;
}

export function KPICard({ label, value, subtitle, trend, color, icon }: Props) {
  const trendColor = trend
    ? trend.value >= 0 ? '#66bb6a' : '#ef5350'
    : undefined;

  return (
    <Card sx={{ p: 2.5, flex: 1, minWidth: 160 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle2" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </Typography>
          {icon && (
            <Box sx={{ color: color || 'primary.main', opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Stack>

        <Typography
          variant="h5"
          className="mono"
          sx={{ fontWeight: 800, color: color || 'text.primary', lineHeight: 1 }}
        >
          {value}
        </Typography>

        {(subtitle || trend) && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {trend && (
              <>
                {trend.value >= 0
                  ? <TrendingUpIcon sx={{ fontSize: 14, color: trendColor }} />
                  : <TrendingDownIcon sx={{ fontSize: 14, color: trendColor }} />
                }
                <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                  {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
                </Typography>
              </>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
