'use client';

import { Tooltip, Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { getMetricDef } from '@/lib/risk-appetite/metric-registry';
import { formatPercent } from '@/lib/format';
import { RAG_COLORS } from '@/lib/constants';
import type { ThresholdContext } from '@/lib/types';

interface BreachBadgeProps {
  metricKey: string;
  value: number;
  children: React.ReactNode;
  context?: ThresholdContext;
}

function formatThresholdValue(val: number, direction: string): string {
  const op = direction === 'lower_is_better' ? '\u2264' : '\u2265'; // ≤ or ≥
  return `${op} ${formatPercent(val)}`;
}

export function BreachBadge({ metricKey, value, children, context }: BreachBadgeProps) {
  const { getStatus, getThreshold } = useRiskAppetite();
  const def = getMetricDef(metricKey);
  const status = getStatus(metricKey, value, context);
  const threshold = getThreshold(metricKey, context);

  if (!def) return <>{children}</>;

  const label = def.label;
  const direction = def.direction;
  const statusLabel = status === 'Green' ? 'Within Appetite' : status === 'Amber' ? 'Appetite Breach' : 'Tolerance Breach';
  const statusIcon = status === 'Green' ? '\u2713' : '\u26A0'; // ✓ or ⚠
  const scopeLabel = threshold.scopeLevel === 'global' ? 'Global'
    : threshold.scopeLevel === 'region' ? 'Region'
    : threshold.scopeLevel === 'subsidiary' ? 'Subsidiary'
    : threshold.scopeLevel === 'business_line' ? 'Business Line'
    : 'Product';

  const tooltipContent = (
    <Box sx={{ p: 0.5, minWidth: 160 }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, mb: 0.5 }}>
        {label}: {formatPercent(value)}
      </Typography>
      <Typography sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        color: RAG_COLORS[status],
        mb: 0.5,
      }}>
        {statusIcon} {statusLabel}
      </Typography>
      <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }}>
        Appetite: {formatThresholdValue(threshold.appetite, direction)}
      </Typography>
      {status !== 'Green' && (
        <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }}>
          Tolerance: {formatThresholdValue(threshold.tolerance, direction)}
        </Typography>
      )}
      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mt: 0.25 }}>
        Scope: {scopeLabel}{threshold.isInherited && threshold.scopeLevel !== 'global' ? ' (inherited)' : ''}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.3,
          cursor: 'default',
        }}
      >
        {children}
        {status !== 'Green' && (
          <WarningAmberIcon
            sx={{
              fontSize: 12,
              color: RAG_COLORS[status],
              flexShrink: 0,
              ...(status === 'Red' && {
                '@keyframes breachPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
                animation: 'breachPulse 2s ease-in-out infinite',
              }),
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
}
