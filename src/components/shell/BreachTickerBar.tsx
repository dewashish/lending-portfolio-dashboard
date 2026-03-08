'use client';

import { useState, useEffect } from 'react';
import { Button, Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { BreachAlert } from '@/hooks/useBreachAlerts';

const RAG = { red: '#f44336', amber: '#ff9800' } as const;

interface Props {
  alerts: BreachAlert[];
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function BreachTickerBar({ alerts, onClick }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % alerts.length);
        setVisible(true);
      }, 250);
    }, 3000);
    return () => clearInterval(interval);
  }, [alerts.length]);

  useEffect(() => {
    setCurrentIndex(0);
    setVisible(true);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const hasRed = alerts.some((a) => a.rag === 'red');
  const worstColor = hasRed ? RAG.red : RAG.amber;
  const current = alerts[currentIndex] ?? alerts[0];

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={onClick}
        startIcon={
          <WarningAmberIcon
            sx={{
              fontSize: '16px !important',
              color: worstColor,
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
              animation: hasRed ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
        }
        sx={{
          fontSize: '0.72rem',
          textTransform: 'none',
          borderColor: worstColor,
          color: 'text.primary',
          width: 220,
          overflow: 'hidden',
          position: 'relative',
          px: 1.5,
          flexShrink: 0,
          '&:hover': {
            borderColor: worstColor,
            bgcolor: hasRed ? 'rgba(244,67,54,0.08)' : 'rgba(255,152,0,0.08)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current.label}: {current.formattedValue}
          </Typography>
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: current.rag === 'red' ? RAG.red : RAG.amber,
              flexShrink: 0,
            }}
          />
        </Box>
      </Button>
    </>
  );
}
