'use client';

import { Card, Typography, Box, Stack, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { formatPercent } from '@/lib/format';
import { BreachBadge } from '@/components/common/BreachBadge';
import type { ThresholdContext } from '@/lib/types';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  sparklineLabels?: string[];
  invertTrend?: boolean;
  benchmark?: number;
  benchmarkLabel?: string;
  metricKey?: string;
  rawValue?: number;
  thresholdContext?: ThresholdContext;
  /** Tooltip text shown via a small info icon next to the label */
  info?: string;
}

/** Tiny inline SVG sparkline — no D3 dependency */
function Sparkline({ data, color, height = 24, width = 72, labels }: { data: number[]; color?: string; height?: number; width?: number; labels?: string[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 2;
  const usableH = height - padY * 2;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: padY + usableH - ((v - min) / range) * usableH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height} L0,${height} Z`;

  const lineColor = color || '#00897b';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${lineColor.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Interactive dots with tooltips */}
      {points.map((p, i) => {
        const label = labels?.[labels.length - data.length + i] ?? '';
        const pct = (data[i] * 100).toFixed(2);
        const title = label ? `${label}: ${pct}%` : `${pct}%`;
        return (
          <Tooltip key={i} title={title} arrow placement="top">
            <circle
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 2.5 : 1.5}
              fill={i === points.length - 1 ? lineColor : 'transparent'}
              stroke={lineColor}
              strokeWidth={0.5}
              style={{ cursor: 'pointer' }}
            />
          </Tooltip>
        );
      })}
    </svg>
  );
}

export function KPICard({ label, value, subtitle, trend, color, icon, sparkline, sparklineLabels, invertTrend, benchmark, benchmarkLabel, metricKey, rawValue, thresholdContext, info }: Props) {
  // For inverted metrics (delinquency, FPD): down is green, up is red
  const getTrendColor = () => {
    if (!trend) return undefined;
    if (Math.abs(trend.value) < 0.1) return '#78909c'; // flat = grey
    if (invertTrend) {
      return trend.value <= 0 ? '#66bb6a' : '#ef5350';
    }
    return trend.value >= 0 ? '#66bb6a' : '#ef5350';
  };

  const trendColor = getTrendColor();

  const TrendIcon = !trend
    ? null
    : Math.abs(trend.value) < 0.1
      ? TrendingFlatIcon
      : trend.value >= 0
        ? TrendingUpIcon
        : TrendingDownIcon;

  return (
    <Card sx={{ p: 2, flex: '1 1 0', minWidth: 130, position: 'relative', overflow: 'visible' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'text.secondary',
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
            {info && (
              <Tooltip title={info} arrow placement="top">
                <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: color || 'primary.main', opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Stack>

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1}>
          {metricKey != null && rawValue != null ? (
            <BreachBadge metricKey={metricKey} value={rawValue} context={thresholdContext}>
              <Typography
                variant="h5"
                className="mono"
                sx={{ fontWeight: 800, color: color || 'text.primary', lineHeight: 1, fontSize: '1.25rem' }}
              >
                {value}
              </Typography>
            </BreachBadge>
          ) : (
            <Typography
              variant="h5"
              className="mono"
              sx={{ fontWeight: 800, color: color || 'text.primary', lineHeight: 1, fontSize: '1.25rem' }}
            >
              {value}
            </Typography>
          )}

          {sparkline && sparkline.length >= 2 && (
            <Box sx={{ flexShrink: 0, opacity: 0.85 }}>
              <Sparkline data={sparkline} color={color || '#00897b'} labels={sparklineLabels} />
            </Box>
          )}
        </Stack>

        {/* Trend + subtitle row */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 18 }}>
          {trend && TrendIcon && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.3,
                bgcolor: trendColor ? `${trendColor}18` : undefined,
                borderRadius: 0.5,
                px: 0.5,
                py: 0.1,
              }}
            >
              <TrendIcon sx={{ fontSize: 12, color: trendColor }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }}>
                {trend.value >= 0 ? '+' : ''}{formatPercent(trend.value, 1)}
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
              {subtitle}
            </Typography>
          )}
          {benchmark != null && (
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', ml: 'auto' }}>
              {benchmarkLabel || 'BM'}: {typeof benchmark === 'number' ? formatPercent(benchmark, 1) : benchmark}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
