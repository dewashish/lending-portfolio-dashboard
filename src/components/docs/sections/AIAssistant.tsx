'use client';

import { Typography, Box, Card, Grid, Chip, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const SUGGESTED_QUESTIONS = [
  'What is the current NPL ratio?',
  'Which entity has the highest exposure?',
  'Summarize the watchlist status',
  'What are the top concentration risks?',
  'How is the EWS score trending?',
  'Compare delinquency rates across subsidiaries',
];

export function AIAssistant() {
  return (
    <PRDSection id="ai-assistant" title="AI Assistant" sectionNumber={11}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform integrates a conversational AI assistant powered by Google Gemini that enables
        natural language querying of portfolio data. The assistant is scope-aware — it factors in
        the user&apos;s current Group/Region/Subsidiary selection when generating responses, ensuring
        answers reflect the relevant data context.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>Capabilities</Typography>
            <List dense disablePadding>
              {[
                'Natural language queries about portfolio KPIs and trends',
                'Scope-aware responses filtered to current selection',
                'Suggested starter questions for quick insights',
                'Conversational follow-up within session',
                'Drawer-based UI (420px right panel) for non-intrusive interaction',
                'Loading indicators during response generation',
              ].map((cap, i) => (
                <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{cap}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>Suggested Questions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Chip
                  key={q}
                  label={q}
                  variant="outlined"
                  size="small"
                  sx={{ justifyContent: 'flex-start', fontSize: '0.72rem', fontWeight: 500 }}
                />
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      <DiagramBox title="AI Query Flow">
{`  User Action                  System Response
  ──────────                   ───────────────
  Opens AI panel          ───▶  Drawer slides in (420px)
                                Suggested questions displayed
  Selects/types question  ───▶  Query sent to /api/gemini
                                Current scope context included
  Waits for response      ───▶  Gemini processes query + data
                                Loading indicator shown
  Reads response          ───▶  Formatted answer displayed
                                Chat history maintained
  Asks follow-up          ───▶  Conversation continues
                                Previous context preserved`}
      </DiagramBox>
    </PRDSection>
  );
}
