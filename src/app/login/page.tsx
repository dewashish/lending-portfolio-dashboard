'use client';

import { Box, Card, Typography, Button, Stack } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(ellipse at 30% 20%, rgba(0,137,123,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,111,0,0.08) 0%, transparent 50%), #0a0f1a'
          : 'radial-gradient(ellipse at 30% 20%, rgba(0,137,123,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,111,0,0.04) 0%, transparent 50%), #f5f7fa',
      }}
    >
      <Card
        sx={{
          p: 5,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #00897b 0%, #004d40 100%)',
            }}
          >
            <ShowChartIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Box>

          <Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Portfolio Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Group-level credit risk dashboard
            </Typography>
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<LockIcon />}
            onClick={() => router.push('/dashboard')}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #00897b 0%, #00695c 100%)',
              color: '#fff',
              '&:hover': { background: 'linear-gradient(135deg, #00a08a 0%, #00897b 100%)' },
            }}
          >
            SSO Login
          </Button>

          <Typography variant="caption" color="text.secondary">
            Single Sign-On via corporate identity provider
          </Typography>
        </Stack>
      </Card>
    </Box>
  );
}
