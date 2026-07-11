'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import { AVA_IRIS } from '@/lib/ava/brand';

interface Props {
  /** Called with the "transcribed" text once the mock capture completes. */
  onTranscribe: (text: string) => void;
  /** What the mock recognizer hears. */
  phrase: string;
  disabled?: boolean;
}

const RECORD_MS = 2200;

/**
 * Voice input (demo): pressing the mic shows a live waveform for ~2s, then
 * "transcribes" the context's lead question into the input.
 */
export function AvaVoiceButton({ onTranscribe, phrase, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const start = () => {
    if (recording || disabled) return;
    setRecording(true);
    timer.current = setTimeout(() => {
      setRecording(false);
      onTranscribe(phrase);
    }, RECORD_MS);
  };

  if (recording) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          px: 1,
          height: 30,
          borderRadius: 15,
          bgcolor: '#ef535022',
          border: '1px solid #ef535066',
          '@keyframes avaWave': {
            '0%, 100%': { transform: 'scaleY(0.35)' },
            '50%': { transform: 'scaleY(1)' },
          },
        }}
        aria-label="Listening"
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ef5350', mr: 0.5, animation: 'avaWave 1s ease-in-out infinite' }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            sx={{
              width: 2.5,
              height: 14,
              borderRadius: 1,
              bgcolor: '#ef5350',
              animation: `avaWave ${0.7 + i * 0.12}s ease-in-out infinite`,
              animationDelay: `${i * 0.09}s`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', transform: 'scaleY(0.6)' },
            }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Tooltip title="Ask by voice" arrow>
      <span>
        <IconButton size="small" onClick={start} disabled={disabled} aria-label="Ask by voice"
          sx={{ '&:hover': { color: AVA_IRIS } }}>
          <MicNoneOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </span>
    </Tooltip>
  );
}
