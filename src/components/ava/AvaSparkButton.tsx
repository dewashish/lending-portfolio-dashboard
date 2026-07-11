'use client';

import { IconButton, Tooltip } from '@mui/material';
import type { AvaContext } from '@/lib/ava/types';
import { AVA_GRADIENT_SOFT, AVA_IRIS } from '@/lib/ava/brand';
import { AvaMark } from './AvaMark';
import { useAva } from './AvaProvider';

interface Props {
  context: AvaContext;
  size?: 'small' | 'medium';
  /** Extra transparency until hover — for dense surfaces like KPI cards. */
  subtle?: boolean;
  className?: string;
}

/** The universal AVA affordance: a spark that opens the ask popover for its context. */
export function AvaSparkButton({ context, size = 'small', subtle, className }: Props) {
  const { openAsk } = useAva();
  const px = size === 'small' ? 16 : 20;
  return (
    <Tooltip title={`Ask AVA about ${context.breadcrumb[context.breadcrumb.length - 1] ?? 'this'}`} arrow placement="top">
      <IconButton
        className={className}
        size="small"
        aria-label="Ask AVA"
        onClick={(e) => {
          e.stopPropagation();
          openAsk(context, { el: e.currentTarget });
        }}
        sx={{
          p: 0.5,
          opacity: subtle ? 0.45 : 0.8,
          transition: 'opacity 0.15s ease, background 0.15s ease, transform 0.15s ease',
          '&:hover': {
            opacity: 1,
            background: AVA_GRADIENT_SOFT,
            transform: 'scale(1.1)',
            boxShadow: `0 0 0 1px ${AVA_IRIS}44`,
          },
        }}
      >
        <AvaMark size={px} />
      </IconButton>
    </Tooltip>
  );
}
