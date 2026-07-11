'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Chip, CircularProgress, Collapse, Divider, Drawer, IconButton, InputBase, Stack, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AvaMessage, AvaReasoningStep } from '@/lib/ava/types';
import { AVA_DISCLAIMER, AVA_GRADIENT, AVA_IRIS, AVA_NAME, AVA_ROLE, AVA_TEAL } from '@/lib/ava/brand';
import { AvaMark } from './AvaMark';
import { AvaEvidence } from './AvaEvidence';
import { AvaVoiceButton } from './AvaVoiceButton';
import { useAva } from './AvaProvider';

const STEP_MS = 750;
const STREAM_CHARS_PER_TICK = 7;
const STREAM_TICK_MS = 16;

/* ── Reasoning trace ─────────────────────────────────────────────── */

function ReasoningTrace({ steps, completed, collapsed }: { steps: AvaReasoningStep[]; completed: number; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const open = !collapsed || expanded;

  return (
    <Box
      sx={{
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        overflow: 'hidden',
      }}
    >
      <Box
        component="button"
        onClick={() => collapsed && setExpanded(!expanded)}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          px: 1.25,
          py: 0.75,
          cursor: collapsed ? 'pointer' : 'default',
        }}
      >
        {completed < steps.length ? (
          <CircularProgress size={11} thickness={5} sx={{ color: AVA_IRIS }} />
        ) : (
          <CheckCircleRoundedIcon sx={{ fontSize: 13, color: AVA_TEAL }} />
        )}
        <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 700, color: 'text.secondary', flex: 1 }}>
          {completed < steps.length ? 'Analyzing…' : `Analysis complete — ${steps.length} steps`}
        </Typography>
        {collapsed && (
          <ExpandMoreRoundedIcon
            sx={{ fontSize: 15, color: 'text.disabled', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        )}
      </Box>
      <Collapse in={open}>
        <Stack spacing={0.6} sx={{ px: 1.25, pb: 1, pt: 0.25 }}>
          {steps.map((step, i) => {
            const state = i < completed ? 'done' : i === completed ? 'active' : 'pending';
            return (
              <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start" sx={{ opacity: state === 'pending' ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                <Box sx={{ width: 13, pt: '1px', display: 'flex', justifyContent: 'center' }}>
                  {state === 'done' && <CheckCircleRoundedIcon sx={{ fontSize: 12, color: AVA_TEAL }} />}
                  {state === 'active' && <CircularProgress size={10} thickness={5} sx={{ color: AVA_IRIS }} />}
                  {state === 'pending' && <Box sx={{ width: 5, height: 5, mt: '3px', borderRadius: '50%', bgcolor: 'text.disabled' }} />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.66rem', lineHeight: 1.35, display: 'block' }}>
                    {step.text}
                  </Typography>
                  {step.detail && state !== 'pending' && (
                    <Typography variant="caption" className="mono" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                      {step.detail}
                    </Typography>
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}

/* ── Markdown styling ────────────────────────────────────────────── */

const MD_SX = {
  fontSize: '0.76rem',
  lineHeight: 1.6,
  '& p': { m: 0, mb: 1 },
  '& p:last-child': { mb: 0 },
  '& strong': { fontWeight: 700 },
  '& ul, & ol': { m: 0, mb: 1, pl: 2.25 },
  '& li': { mb: 0.4 },
  '& h1, & h2, & h3': { fontSize: '0.82rem', fontWeight: 700, mt: 1.25, mb: 0.5 },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    my: 1,
    fontSize: '0.68rem',
    display: 'block',
    overflowX: 'auto',
  },
  '& th': { textAlign: 'left', fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider', px: 0.75, py: 0.4, whiteSpace: 'nowrap' },
  '& td': { borderBottom: '1px solid', borderColor: 'divider', px: 0.75, py: 0.4, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.64rem' },
  '& td:first-of-type': { fontFamily: 'inherit' },
  '& code': { fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.68rem', px: 0.5, borderRadius: 0.5, bgcolor: 'action.hover' },
  '& blockquote': { m: 0, mb: 1, pl: 1.25, borderLeft: '3px solid', borderColor: AVA_IRIS },
} as const;

/* ── One AVA response (animates when live) ───────────────────────── */

function AvaResponse({ message, live, onDone, onProgress }: {
  message: AvaMessage;
  live: boolean;
  onDone: () => void;
  onProgress: () => void;
}) {
  const answer = message.answer!;
  const steps = answer.reasoning;
  const [completedSteps, setCompletedSteps] = useState(live ? 0 : steps.length);
  const [revealed, setRevealed] = useState(live ? 0 : answer.markdown.length);
  const [copied, setCopied] = useState(false);
  const phase = completedSteps < steps.length ? 'reasoning' : revealed < answer.markdown.length ? 'streaming' : 'done';

  // Sequential reasoning steps
  useEffect(() => {
    if (!live || phase !== 'reasoning') return;
    const t = setTimeout(() => setCompletedSteps((c) => c + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [live, phase, completedSteps]);

  // Typewriter stream
  useEffect(() => {
    if (!live || phase !== 'streaming') return;
    const t = setInterval(() => {
      setRevealed((r) => Math.min(answer.markdown.length, r + STREAM_CHARS_PER_TICK));
      onProgress();
    }, STREAM_TICK_MS);
    return () => clearInterval(t);
  }, [live, phase, answer.markdown.length, onProgress]);

  const doneNotified = useRef(false);
  useEffect(() => {
    if (live && phase === 'done' && !doneNotified.current) {
      doneNotified.current = true;
      onDone();
    }
  }, [live, phase, onDone]);

  const text = answer.markdown.slice(0, revealed);
  const { askFollowUp, busy } = useAva();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.75 }}>
        <AvaMark size={13} />
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
          {AVA_NAME}
        </Typography>
      </Stack>

      <ReasoningTrace steps={steps} completed={completedSteps} collapsed={phase === 'done'} />

      {phase !== 'reasoning' && (
        <Box sx={MD_SX}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </Box>
      )}

      {phase === 'done' && (
        <>
          {answer.evidence && <AvaEvidence evidence={answer.evidence} />}

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
            <Tooltip title={copied ? 'Copied' : 'Copy analysis'} arrow>
              <IconButton size="small" onClick={copy} sx={{ p: 0.4, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                {copied ? <DoneRoundedIcon sx={{ fontSize: 13, color: AVA_TEAL }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />}
              </IconButton>
            </Tooltip>
          </Stack>

          {answer.followUps && answer.followUps.length > 0 && (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {answer.followUps.map((fu) => (
                <Chip
                  key={fu.label}
                  label={fu.label}
                  size="small"
                  clickable
                  disabled={busy}
                  onClick={() => askFollowUp(fu.label, fu.answer)}
                  sx={{
                    height: 24,
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    border: `1px solid ${AVA_IRIS}55`,
                    bgcolor: `${AVA_IRIS}10`,
                    '&:hover': { bgcolor: `${AVA_IRIS}26` },
                  }}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

/* ── The drawer ──────────────────────────────────────────────────── */

export function AvaDrawer() {
  const { drawerOpen, closeDrawer, messages, liveMessageId, markLiveDone, askInDrawer, busy } = useAva();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].context) return messages[i].context;
    }
    return undefined;
  }, [messages]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, drawerOpen]);

  const submit = (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setText('');
    askInDrawer(question);
  };

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={closeDrawer}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 560 }, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' } }}
    >
      <Box sx={{ height: 3, background: AVA_GRADIENT, flexShrink: 0 }} />

      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, pb: 1, flexShrink: 0 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: AVA_GRADIENT, boxShadow: `0 4px 14px ${AVA_IRIS}44`,
          }}
        >
          <AvaMark size={20} color="#fff" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2, letterSpacing: '0.02em' }}>
            {AVA_NAME}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
            {AVA_ROLE}
          </Typography>
        </Box>
        <IconButton size="small" onClick={closeDrawer} aria-label="Close AVA">
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {/* Context chips */}
      {context && (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ px: 1.5, pb: 1, flexShrink: 0 }}>
          <Chip size="small" label={context.breadcrumb.join(' › ')} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }} />
          {context.selection?.map((sel) => (
            <Chip
              key={sel}
              size="small"
              label={sel}
              sx={{
                height: 20, fontSize: '0.6rem', fontWeight: 600,
                color: AVA_IRIS, border: `1px solid ${AVA_IRIS}55`, bgcolor: `${AVA_IRIS}14`,
              }}
            />
          ))}
        </Stack>
      )}

      <Divider sx={{ flexShrink: 0 }} />

      {/* Conversation */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
              <Box
                sx={{
                  maxWidth: '85%',
                  px: 1.5,
                  py: 0.9,
                  borderRadius: '14px 14px 4px 14px',
                  background: AVA_GRADIENT,
                  color: '#fff',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.45 }}>
                  {msg.content}
                </Typography>
              </Box>
            </Box>
          ) : (
            <AvaResponse
              key={msg.id}
              message={msg}
              live={msg.id === liveMessageId}
              onDone={markLiveDone}
              onProgress={scrollToBottom}
            />
          ),
        )}
      </Box>

      <Divider sx={{ flexShrink: 0 }} />

      {/* Input */}
      <Box sx={{ p: 1.25, flexShrink: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, pl: 1.5, pr: 0.75, py: 0.5 }}
        >
          <InputBase
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(text); }}
            placeholder={busy ? `${AVA_NAME} is analyzing…` : 'Ask a follow-up…'}
            disabled={busy}
            sx={{ flex: 1, fontSize: '0.76rem' }}
            inputProps={{ 'aria-label': 'Ask AVA a follow-up' }}
          />
          <AvaVoiceButton
            phrase="What would you do about this in the next two cycles?"
            disabled={busy}
            onTranscribe={(t) => { setText(t); setTimeout(() => submit(t), 450); }}
          />
          <IconButton
            size="small"
            onClick={() => submit(text)}
            disabled={!text.trim() || busy}
            aria-label="Send"
            sx={{
              background: text.trim() && !busy ? AVA_GRADIENT : undefined,
              color: text.trim() && !busy ? '#fff' : undefined,
              '&:hover': { background: text.trim() && !busy ? AVA_GRADIENT : undefined, opacity: 0.9 },
            }}
          >
            <SendRoundedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.6, px: 0.5, fontSize: '0.56rem', color: 'text.disabled', lineHeight: 1.3 }}>
          {AVA_DISCLAIMER}
        </Typography>
      </Box>
    </Drawer>
  );
}
