'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Box, Typography, Button, Card } from '@mui/material';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card sx={{ p: 4, maxWidth: 600, border: '1px solid', borderColor: 'error.main' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Dashboard Error
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          {error.message}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
          {error.stack}
        </Typography>
        {error.digest && (
          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.disabled' }}>
            Digest: {error.digest}
          </Typography>
        )}
        <Button variant="outlined" onClick={reset}>
          Try Again
        </Button>
      </Card>
    </Box>
  );
}
