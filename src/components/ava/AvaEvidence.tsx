'use client';

import { Box, Stack, Typography } from '@mui/material';
import type { AvaEvidence as AvaEvidenceType, AvaTone } from '@/lib/ava/types';
import { AVA_TEAL } from '@/lib/ava/brand';

const TONE_COLORS: Record<AvaTone, string> = {
  bad: '#ef5350',
  warn: '#ffa726',
  good: '#66bb6a',
  neutral: '#78909c',
};

/** Compact segment-attribution bars shown under an AVA answer. */
export function AvaEvidence({ evidence }: { evidence: AvaEvidenceType }) {
  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: AVA_TEAL, display: 'block', mb: 1 }}
      >
        {evidence.title}
      </Typography>
      <Stack spacing={0.75}>
        {evidence.items.map((item) => (
          <Box key={item.label}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.25 }}>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
                {item.label}
              </Typography>
              <Typography variant="caption" className="mono" sx={{ fontSize: '0.68rem', fontWeight: 700, color: TONE_COLORS[item.tone] }}>
                {item.value}
              </Typography>
            </Stack>
            <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.max(2, Math.min(100, item.share))}%`,
                  borderRadius: 2,
                  bgcolor: TONE_COLORS[item.tone],
                  opacity: 0.85,
                  transition: 'width 0.6s ease',
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
      {evidence.footnote && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, fontSize: '0.6rem', color: 'text.disabled' }}>
          {evidence.footnote}
        </Typography>
      )}
    </Box>
  );
}
