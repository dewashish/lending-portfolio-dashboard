'use client';

import { Box, Paper, Typography } from '@mui/material';

interface Props {
  title?: string;
  children: React.ReactNode;
}

export function DiagramBox({ title, children }: Props) {
  return (
    <Box sx={{ my: 2 }}>
      {title && (
        <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.72rem', color: 'text.secondary' }}>
          {title}
        </Typography>
      )}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          overflow: 'auto',
          bgcolor: 'background.default',
          borderRadius: 2,
        }}
      >
        <Typography
          component="pre"
          sx={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '0.72rem',
            lineHeight: 1.7,
            whiteSpace: 'pre',
            m: 0,
            color: 'text.primary',
          }}
        >
          {children}
        </Typography>
      </Paper>
    </Box>
  );
}
