'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box, Chip, Divider, IconButton, InputBase, Popover, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { getSuggestedQuestions } from '@/lib/ava/insights';
import { AVA_GRADIENT, AVA_IRIS, AVA_NAME } from '@/lib/ava/brand';
import { AvaMark } from './AvaMark';
import { AvaVoiceButton } from './AvaVoiceButton';
import { useAva } from './AvaProvider';

/**
 * The ask popover — appears next to whatever the user clicked or selected.
 * Shows exactly what context AVA has picked up, offers pre-generated
 * questions, and takes free text or voice.
 */
export function AvaAskPopover() {
  const { askState, closeAsk, ask } = useAva();
  const [text, setText] = useState('');

  const open = Boolean(askState);
  const context = askState?.context;

  const suggestions = useMemo(() => (context ? getSuggestedQuestions(context) : []), [context]);

  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  if (!context) return null;

  const submit = (q: string) => {
    const question = q.trim();
    if (!question) return;
    ask(context, question);
  };

  const anchorProps = askState?.anchor.el
    ? { anchorEl: askState.anchor.el }
    : {
        anchorReference: 'anchorPosition' as const,
        anchorPosition: askState?.anchor.position ?? { top: 200, left: 200 },
      };

  return (
    <Popover
      open={open}
      onClose={closeAsk}
      {...anchorProps}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 360,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${AVA_IRIS}22`,
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* gradient hairline */}
      <Box sx={{ height: 3, background: AVA_GRADIENT }} />

      <Box sx={{ p: 1.5, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
          <AvaMark size={16} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.02em' }}>
            Ask {AVA_NAME}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={closeAsk} aria-label="Close">
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>

        {/* What AVA sees */}
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
          <Chip
            size="small"
            label={context.breadcrumb.join(' › ')}
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600 }}
          />
          {context.selection?.map((sel) => (
            <Chip
              key={sel}
              size="small"
              label={sel}
              className="mono"
              sx={{
                height: 20,
                fontSize: '0.62rem',
                fontWeight: 600,
                color: AVA_IRIS,
                border: `1px solid ${AVA_IRIS}55`,
                bgcolor: `${AVA_IRIS}14`,
              }}
            />
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Pre-generated questions */}
      <Stack sx={{ py: 0.5 }}>
        {suggestions.map((q) => (
          <Box
            key={q}
            component="button"
            onClick={() => submit(q)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.9,
              transition: 'background 0.12s ease',
              '&:hover': { bgcolor: 'action.hover', '& .ava-q-arrow': { opacity: 1, transform: 'translateX(0)' } },
              '&:focus-visible': { outline: `2px solid ${AVA_IRIS}`, outlineOffset: -2 },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.74rem', flex: 1, lineHeight: 1.4 }}>
              {q}
            </Typography>
            <ArrowForwardRoundedIcon
              className="ava-q-arrow"
              sx={{ fontSize: 14, color: AVA_IRIS, opacity: 0, transform: 'translateX(-4px)', transition: 'all 0.15s ease' }}
            />
          </Box>
        ))}
      </Stack>

      <Divider />

      {/* Free text + voice */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ p: 1, pl: 1.5 }}>
        <InputBase
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(text); }}
          placeholder="Or ask your own question…"
          autoFocus
          sx={{ flex: 1, fontSize: '0.76rem' }}
          inputProps={{ 'aria-label': 'Ask AVA' }}
        />
        <AvaVoiceButton phrase={suggestions[0] ?? ''} onTranscribe={(t) => { setText(t); setTimeout(() => submit(t), 450); }} />
        <IconButton
          size="small"
          onClick={() => submit(text)}
          disabled={!text.trim()}
          aria-label="Send"
          sx={{
            background: text.trim() ? AVA_GRADIENT : undefined,
            color: text.trim() ? '#fff' : undefined,
            '&:hover': { background: text.trim() ? AVA_GRADIENT : undefined, opacity: 0.9 },
          }}
        >
          <SendRoundedIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Stack>
    </Popover>
  );
}
