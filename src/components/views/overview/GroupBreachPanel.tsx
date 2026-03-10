'use client';

import { Paper, Typography, Chip, Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useAllBreachAlerts, type BreachAlert } from '@/hooks/useBreachAlerts';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  onTabChange?: (tabIndex: number) => void;
}

const PRODUCT_TAB_MAP: Record<string, number> = {
  'Consumer Finance': 1,
  'Trade Finance': 3,
  'Corporate Finance': 2,
};

export function GroupBreachPanel({ scope, onTabChange }: Props) {
  const { alerts, isLoading, redCount, amberCount } = useAllBreachAlerts(scope);

  if (isLoading) return null;

  if (alerts.length === 0) {
    return (
      <Paper sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderLeft: '3px solid #4caf50' }}>
        <CheckCircleOutlineIcon sx={{ color: '#4caf50', fontSize: 20 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
          All metrics within risk appetite
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ px: 2.5, py: 1.5, borderLeft: `3px solid ${redCount > 0 ? '#f44336' : '#ff9800'}` }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        {/* Count badges */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {redCount > 0 && (
            <Chip
              icon={<ErrorOutlineIcon sx={{ fontSize: 14 }} />}
              label={`${redCount} Tolerance`}
              size="small"
              sx={{
                bgcolor: '#f4433620',
                color: '#f44336',
                fontWeight: 700,
                fontSize: '0.7rem',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                },
              }}
            />
          )}
          {amberCount > 0 && (
            <Chip
              icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              label={`${amberCount} Appetite`}
              size="small"
              sx={{ bgcolor: '#ff980020', color: '#ff9800', fontWeight: 700, fontSize: '0.7rem' }}
            />
          )}
        </Stack>

        {/* Scrollable alert pills */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ overflowX: 'auto', flex: 1, py: 0.5, '&::-webkit-scrollbar': { height: 4 } }}
        >
          {alerts.map((alert: BreachAlert) => (
            <Chip
              key={alert.id}
              label={`${alert.label}: ${alert.formattedValue}`}
              size="small"
              onClick={() => onTabChange?.(PRODUCT_TAB_MAP[alert.product] ?? 1)}
              sx={{
                flexShrink: 0,
                bgcolor: alert.rag === 'red' ? '#f4433615' : '#ff980015',
                color: alert.rag === 'red' ? '#f44336' : '#ff9800',
                fontWeight: 600,
                fontSize: '0.68rem',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
