'use client';

import { Box, Card, Typography, Button, Stack, Divider } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';

export default function AboutPage() {
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
            <AccountBalanceIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={800}>Avaloura Portfolio Monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Group-level credit risk dashboard for monitoring consumer, trade, and corporate
            lending portfolios across multiple subsidiaries and geographies.
          </Typography>

          <Divider sx={{ width: '100%' }} />

          <Typography variant="body2" color="text.secondary">Version {APP_VERSION}</Typography>

          <Divider sx={{ width: '100%' }} />

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              &copy; {new Date().getFullYear()} Dewashish Dey. All rights reserved.
            </Typography>
          </Stack>

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
