'use client';

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert,
} from '@mui/material';
import { useUser } from '@/lib/user-context';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileSettingsDialog({ open, onClose }: Props) {
  const { profile } = useUser();
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update email.');
        return;
      }

      setSuccess(true);
      // Reload page to pick up new JWT cookie
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Profile Settings</DialogTitle>
      <DialogContent>
        <TextField
          label="Display Name"
          value={profile?.displayName ?? ''}
          disabled
          fullWidth
          size="small"
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          fullWidth
          size="small"
          helperText="Used for sending executive summary reports"
        />
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 1.5 }}>Email updated successfully.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small" disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
