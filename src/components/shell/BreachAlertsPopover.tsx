'use client';

import { Popover, Box, Typography, Chip, Divider, Stack } from '@mui/material';
import type { BreachAlert } from '@/hooks/useBreachAlerts';

const RAG = { red: '#f44336', amber: '#ff9800' } as const;

const PRODUCT_ORDER = ['Consumer Finance', 'Trade Finance', 'Corporate Finance'] as const;

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  alerts: BreachAlert[];
}

export function BreachAlertsPopover({ anchorEl, open, onClose, alerts }: Props) {
  const redCount = alerts.filter((a) => a.rag === 'red').length;
  const amberCount = alerts.filter((a) => a.rag === 'amber').length;

  // Group alerts by product
  const grouped = PRODUCT_ORDER
    .map((product) => ({
      product,
      items: alerts
        .filter((a) => a.product === product)
        .sort((a, b) => {
          if (a.rag !== b.rag) return a.rag === 'red' ? -1 : 1;
          return a.label.localeCompare(b.label);
        }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 400,
            maxHeight: 480,
            overflow: 'auto',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          Portfolio Health Alerts
        </Typography>
        <Stack direction="row" spacing={0.75}>
          {redCount > 0 && (
            <Chip
              size="small"
              label={`${redCount} Tolerance Breach`}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: 'rgba(244,67,54,0.12)',
                color: RAG.red,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          {amberCount > 0 && (
            <Chip
              size="small"
              label={`${amberCount} Appetite Breach`}
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: 'rgba(255,152,0,0.12)',
                color: RAG.amber,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Grouped alerts */}
      {grouped.map((group, gi) => (
        <Box key={group.product}>
          {gi > 0 && <Divider />}
          <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}>
              {group.product}
            </Typography>
          </Box>
          {group.items.map((alert) => (
            <Box
              key={alert.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* RAG dot */}
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: alert.rag === 'red' ? RAG.red : RAG.amber,
                  flexShrink: 0,
                }}
              />

              {/* Metric label + value */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: 'text.primary' }}>
                  {alert.label}: {alert.formattedValue}
                </Typography>
                <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                  Appetite: {(alert.appetite * 100).toFixed(1)}% · Tolerance: {(alert.tolerance * 100).toFixed(1)}%
                </Typography>
              </Box>

              {/* Status label */}
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  color: alert.rag === 'red' ? RAG.red : RAG.amber,
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                {alert.statusLabel}
              </Typography>
            </Box>
          ))}
        </Box>
      ))}

      {/* Empty state */}
      {alerts.length === 0 && (
        <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            All metrics within risk appetite
          </Typography>
        </Box>
      )}
    </Popover>
  );
}
