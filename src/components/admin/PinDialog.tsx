'use client';

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, CircularProgress,
} from '@mui/material';
import { useAdmin } from '@/lib/admin-context';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PinDialog({ open, onClose }: Props) {
  const { unlock } = useAdmin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setError('');
    const success = await unlock(pin.trim());
    setLoading(false);
    if (success) {
      setPin('');
      onClose();
    } else {
      setError('Invalid PIN. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
        Admin Access
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.78rem' }}>
          Enter the admin PIN to edit risk appetite settings.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="PIN"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          error={!!error}
          helperText={error}
          inputProps={{ maxLength: 10 }}
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="small"
          disabled={loading || !pin.trim()}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
