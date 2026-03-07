'use client';

import { useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';

export function ExecutiveSummaryButton() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { generateExecutiveSummary } = await import('@/lib/pdf/executive-summary');
      await generateExecutiveSummary();
    } catch (err) {
      console.error('Executive summary generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tooltip title="Generate a 4-page executive summary PDF from live data">
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
