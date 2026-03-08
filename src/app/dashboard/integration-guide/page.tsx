'use client';

import { Box, Card, Typography, Button, Stack } from '@mui/material';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function IntegrationGuidePage() {
  const router = useRouter();

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Card sx={{ maxWidth: 520, width: '100%', p: 5, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #00897b 0%, #004d40 100%)',
            }}
          >
            <IntegrationInstructionsIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={800}>Integration Guide</Typography>
          <Typography variant="body2" color="text.secondary">
            Technical integration documentation for connecting data sources,
            configuring APIs, and setting up automated data pipelines will be available here.
          </Typography>
          <Typography variant="caption" color="text.disabled">Coming Soon</Typography>

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            Back to Dashboard
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
