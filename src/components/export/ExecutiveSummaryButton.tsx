'use client';

import { useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  activeTab?: number;
  scope?: ScopeSelection;
}

export function ExecutiveSummaryButton({ activeTab = 1, scope }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      switch (activeTab) {
        case 0: {
          const { generateGroupExecSummary } = await import('@/lib/pdf/group-exec-summary');
          await generateGroupExecSummary(scope);
          break;
        }
        case 1: {
          const { generateExecutiveSummary } = await import('@/lib/pdf/executive-summary');
          await generateExecutiveSummary(scope);
          break;
        }
        case 2: {
          const { generateTradeExecSummary } = await import('@/lib/pdf/trade-exec-summary');
          await generateTradeExecSummary(scope);
          break;
        }
        case 3: {
          const { generateCorporateExecSummary } = await import('@/lib/pdf/corporate-exec-summary');
          await generateCorporateExecSummary(scope);
          break;
        }
        case 4: {
          const { generateRiskExecSummary } = await import('@/lib/pdf/risk-exec-summary');
          await generateRiskExecSummary(scope);
          break;
        }
      }
    } catch (err) {
      console.error('Executive summary generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tooltip title="Generate Executive Summary PDF for current tab">
      <Button
        size="small"
        variant="outlined"
        startIcon={generating ? <CircularProgress size={14} /> : <SummarizeIcon />}
        onClick={handleGenerate}
        disabled={generating}
        sx={{
          fontSize: '0.72rem',
          textTransform: 'none',
          borderColor: 'divider',
          color: 'text.secondary',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
        }}
      >
        {generating ? 'Generating...' : 'Executive Summary'}
      </Button>
    </Tooltip>
  );
}
