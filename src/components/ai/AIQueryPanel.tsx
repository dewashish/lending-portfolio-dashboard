'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QueryInput } from './QueryInput';

import type { ScopeSelection } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  scope?: ScopeSelection;
  portfolio?: unknown;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  'What is the current NPL ratio?',
  'Which entity has the highest exposure?',
  'Summarize the watchlist status',
  'What are the top concentration risks?',
  'How is the EWS score trending?',
];

const mdComponents: Components = {
  table: ({ children }) => (
    <TableContainer sx={{ my: 1 }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell
      sx={{
        fontWeight: 700,
        fontSize: '0.75rem',
        py: 0.5,
        px: 1,
        whiteSpace: 'nowrap',
        borderColor: 'divider',
      }}
    >
      {children}
    </TableCell>
  ),
  td: ({ children }) => (
    <TableCell
      sx={{
        fontSize: '0.75rem',
        py: 0.5,
        px: 1,
        fontFamily: 'monospace',
        borderColor: 'divider',
      }}
    >
      {children}
    </TableCell>
  ),
  p: ({ children }) => (
    <Typography variant="body2" sx={{ fontSize: '0.8rem', my: 0.5 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.5, fontSize: '0.8rem' }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.8rem', '& li': { mb: 0.25 } }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ m: 0, pl: 2.5, fontSize: '0.8rem', '& li': { mb: 0.25 } }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ fontSize: '0.8rem' }}>
      {children}
    </Box>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <Box
          component="pre"
          sx={{
            bgcolor: 'rgba(0,0,0,0.3)',
            borderRadius: 1,
            p: 1,
            my: 0.5,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            overflowX: 'auto',
          }}
        >
          <code>{children}</code>
        </Box>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          bgcolor: 'rgba(255,255,255,0.08)',
          px: 0.5,
          borderRadius: 0.5,
        }}
      >
        {children}
      </Box>
    );
  },
};

export function AIQueryPanel({ open, onClose, scope }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (question: string) => {
    const userMsg: Message = { role: 'user', text: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, scope }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        role: 'ai',
        text: data.answer ?? 'Sorry, I could not generate a response.',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'An error occurred while processing your request.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 520,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            AI Portfolio Analyst
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
            Suggested questions
          </Typography>
          {SUGGESTED_QUESTIONS.map((q) => (
            <Chip
              key={q}
              label={q}
              size="small"
              variant="outlined"
              onClick={() => handleSend(q)}
              sx={{
                fontSize: '0.7rem',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            />
          ))}
        </Box>
      )}

      {/* Messages */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor:
                  msg.role === 'user'
                    ? 'primary.main'
                    : 'rgba(255,255,255,0.06)',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
              }}
            >
              {msg.role === 'user' ? (
                <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </Typography>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {msg.text}
                </ReactMarkdown>
              )}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Thinking...
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2 }}>
        <QueryInput onSend={handleSend} loading={loading} />
      </Box>
    </Drawer>
  );
}
