'use client';

import { useState } from 'react';
import { TextField, IconButton, Box } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface Props {
  onSend: (q: string) => void;
  loading: boolean;
}

export function QueryInput({ onSend, loading }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Ask about the portfolio..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        multiline
        maxRows={3}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '0.85rem',
          },
        }}
      />
      <IconButton
        color="primary"
        onClick={handleSubmit}
        disabled={loading || !value.trim()}
        size="small"
        sx={{ mb: 0.25 }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
