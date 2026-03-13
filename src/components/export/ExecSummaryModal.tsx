'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Collapse,
  TextField,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import type { ScopeSelection } from '@/lib/types';
import { useUser } from '@/lib/user-context';
import type { jsPDF } from 'jspdf';

// ── Props ───────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  activeTab: number;
  scope?: ScopeSelection;
}

// ── State machine ───────────────────────────────────────────────────
type ModalState = 'idle' | 'generating' | 'ready' | 'emailing' | 'sent' | 'error';

// ── Tab name mapping ────────────────────────────────────────────────
const TAB_NAMES: Record<number, string> = {
  0: 'Group Overview',
  1: 'Consumer Finance',
  2: 'Trade Finance',
  3: 'Corporate Finance',
  4: 'Risk & Concentrations',
};

// ── Scope label helper ──────────────────────────────────────────────
function scopeLabel(scope?: ScopeSelection): string {
  if (!scope || scope.level === 'group') return 'Group';
  if (scope.level === 'region') return `Region ${scope.regionId}`;
  return `Subsidiary ${scope.subsidiaryId}`;
}

// ── Component ───────────────────────────────────────────────────────
export function ExecSummaryModal({ open, onClose, activeTab, scope }: Props) {
  const { profile } = useUser();

  const [state, setState] = useState<ModalState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Prevent double-fire in StrictMode
  const generatingRef = useRef(false);
  // Store blob URL ref for cleanup
  const blobUrlRef = useRef<string | null>(null);

  const tabName = TAB_NAMES[activeTab] ?? 'Portfolio';
  const scopeLbl = scopeLabel(scope);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // ── Cleanup blob URL ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // ── Reset state helper ──────────────────────────────────────────
  const resetState = useCallback(() => {
    setState('idle');
    setErrorMessage('');
    setShowEmail(false);
    setRecipientEmail('');
    setEmailError('');
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setPdfBase64(null);
  }, []);

  // ── Generate on open ────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      // When closing, reset after animation
      const timer = setTimeout(resetState, 300);
      return () => clearTimeout(timer);
    }

    if (generatingRef.current) return;

    const generate = async () => {
      generatingRef.current = true;
      setState('generating');
      setErrorMessage('');

      try {
        // 1. Call the AI generation API
        const res = await fetch('/api/exec-summary/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeTab, scope }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errData.error || `Server error (${res.status})`);
        }

        const aiData = await res.json();

        if (aiData.error) {
          throw new Error(aiData.error);
        }

        // 2. Dynamically import the PDF generator
        const { generateExecSummaryPDF } = await import('@/lib/pdf/exec-summary-v2');
        const doc: jsPDF = await generateExecSummaryPDF(aiData);

        // 3. Create blob URL for download
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);

        // Clean up previous blob URL if any
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = url;
        setBlobUrl(url);

        // 4. Get base64 for email
        const dataUri = doc.output('datauristring');
        const base64 = dataUri.split(',')[1] ?? '';
        setPdfBase64(base64);

        setState('ready');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setErrorMessage(message);
        setState('error');
      } finally {
        generatingRef.current = false;
      }
    };

    generate();
  }, [open, activeTab, scope, resetState]);

  // ── Download handler ────────────────────────────────────────────
  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${tabName.replace(/\s+/g, '_')}_Executive_Summary_${today.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Email handler ───────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!recipientEmail.trim() || !pdfBase64) return;

    setEmailError('');
    setState('emailing');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          recipientEmail: recipientEmail.trim(),
          reportTitle: `${tabName} Executive Summary`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to send email' }));
        throw new Error(errData.error || `Email send failed (${res.status})`);
      }

      setState('sent');

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      setEmailError(message);
      setState('ready'); // Go back to ready so user can retry
    }
  };

  // ── Retry handler ───────────────────────────────────────────────
  const handleRetry = () => {
    resetState();
    // Re-trigger generation by toggling a micro-state
    // The useEffect above will pick up the next cycle since generatingRef is reset
    setState('generating');
    generatingRef.current = true;

    const generate = async () => {
      try {
        const res = await fetch('/api/exec-summary/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeTab, scope }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errData.error || `Server error (${res.status})`);
        }

        const aiData = await res.json();

        if (aiData.error) {
          throw new Error(aiData.error);
        }

        const { generateExecSummaryPDF } = await import('@/lib/pdf/exec-summary-v2');
        const doc: jsPDF = await generateExecSummaryPDF(aiData);

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = url;
        setBlobUrl(url);

        const dataUri = doc.output('datauristring');
        const base64 = dataUri.split(',')[1] ?? '';
        setPdfBase64(base64);

        setState('ready');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setErrorMessage(message);
        setState('error');
      } finally {
        generatingRef.current = false;
      }
    };

    generate();
  };

  // ── Close handler ───────────────────────────────────────────────
  const handleClose = (_event: object, reason?: string) => {
    // Prevent closing during generation
    if (state === 'generating' && reason === 'escapeKeyDown') return;
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={state === 'generating'}
    >
      {/* ── Generating ──────────────────────────────────────────── */}
      {state === 'generating' && (
        <>
          <DialogTitle>Generating Executive Summary</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" color="text.secondary">
                Analyzing {tabName} portfolio data...
              </Typography>
              <Typography variant="caption" color="text.disabled">
                This may take a few seconds
              </Typography>
            </Box>
          </DialogContent>
        </>
      )}

      {/* ── Ready / Emailing ─────────────────────────────────────── */}
      {(state === 'ready' || state === 'emailing') && (
        <>
          <DialogTitle>Executive Summary Ready</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 1,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {tabName} Executive Summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scope: {scopeLbl} &middot; {today}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => setShowEmail((prev) => !prev)}
              >
                Email Report
              </Button>
            </Box>

            {/* ── Email section ──────────────────────────────────── */}
            <Collapse in={showEmail}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {profile?.email && (
                  <Typography variant="caption" color="text.secondary">
                    From: {profile.email}
                  </Typography>
                )}
                <TextField
                  label="Recipient Email"
                  type="email"
                  size="small"
                  required
                  fullWidth
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={state === 'emailing'}
                />
                {emailError && (
                  <Alert severity="error" variant="outlined" sx={{ py: 0 }}>
                    {emailError}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSendEmail}
                  disabled={!recipientEmail.trim()}
                >
                  Send
                </Button>
              </Box>
            </Collapse>
          </DialogContent>
        </>
      )}

      {/* ── Emailing ────────────────────────────────────────────── */}
      {state === 'emailing' && (
        <>
          <DialogTitle>Executive Summary Ready</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 1,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {tabName} Executive Summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scope: {scopeLbl} &middot; {today}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="contained" startIcon={<DownloadIcon />} disabled>
                Download PDF
              </Button>
              <Button variant="outlined" startIcon={<EmailIcon />} disabled>
                Email Report
              </Button>
            </Box>

            <Collapse in>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {profile?.email && (
                  <Typography variant="caption" color="text.secondary">
                    From: {profile.email}
                  </Typography>
                )}
                <TextField
                  label="Recipient Email"
                  type="email"
                  size="small"
                  required
                  fullWidth
                  value={recipientEmail}
                  disabled
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled
                  startIcon={<CircularProgress size={14} />}
                >
                  Sending...
                </Button>
              </Box>
            </Collapse>
          </DialogContent>
        </>
      )}

      {/* ── Sent ────────────────────────────────────────────────── */}
      {state === 'sent' && (
        <DialogContent>
          <Box sx={{ py: 3 }}>
            <Alert severity="success">
              Report sent successfully to {recipientEmail}
            </Alert>
          </Box>
        </DialogContent>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {state === 'error' && (
        <>
          <DialogTitle>Generation Failed</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 1 }}>
              {errorMessage || 'An unexpected error occurred while generating the summary.'}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleRetry}>Retry</Button>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}

      {/* ── Idle fallback (should not normally be visible) ─────── */}
      {state === 'idle' && null}
    </Dialog>
  );
}
