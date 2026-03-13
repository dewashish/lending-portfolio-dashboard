'use client';

import { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { ExecSummaryModal } from '@/components/export/ExecSummaryModal';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  activeTab?: number;
  scope?: ScopeSelection;
}

export function ExecutiveSummaryButton({ activeTab = 0, scope }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Tooltip title="Generate AI-powered Executive Summary">
        <Button
          size="small"
          variant="outlined"
          startIcon={<SummarizeIcon />}
          onClick={() => setModalOpen(true)}
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
          Executive Summary
        </Button>
      </Tooltip>
      <ExecSummaryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        activeTab={activeTab ?? 0}
        scope={scope}
      />
    </>
  );
}
