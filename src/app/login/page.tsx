'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useTheme } from '@mui/material/styles';
import type { UserRole } from '@/lib/user-context';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'cro', label: 'CRO' },
  { value: 'product_analyst', label: 'Product Analyst' },
  { value: 'risk_analyst', label: 'Risk Analyst' },
];

export default function LoginPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Sign in failed.');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!role) {
      setError('Please select a role.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Sign up failed.');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
  };

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
          maxWidth: 440,
          width: '100%',
          mx: 2,
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

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Avaloura Portfolio Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Group Risk Management Engine
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack spacing={2} sx={{ width: '100%' }}>
            <TextField
              label="Username"
              size="small"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />

            <TextField
              label="Password"
              type="password"
              size="small"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {mode === 'signup' && (
              <FormControl size="small" fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  label="Role"
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={loading}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #00897b 0%, #00695c 100%)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00a08a 0%, #00897b 100%)',
                },
                '&.Mui-disabled': {
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <Typography
                  component="span"
                  variant="body2"
                  onClick={toggleMode}
                  sx={{
                    color: '#00897b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Sign Up
                </Typography>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Typography
                  component="span"
                  variant="body2"
                  onClick={toggleMode}
                  sx={{
                    color: '#00897b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Sign In
                </Typography>
              </>
            )}
          </Typography>
        </Stack>
      </Card>
    </Box>
  );
}
