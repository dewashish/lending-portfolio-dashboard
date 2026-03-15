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

const EXAMPLE_CONVERSATIONS = [
  {
    user: 'What is the current 30+ delinquency rate for Samman Capital?',
    ai: 'Samman Capital\'s 30+ DPD delinquency rate is 3.2% as of Mar\'25, down from 3.5% in Feb\'25. This is within the risk appetite threshold of 5.0%. The improvement is driven by enhanced collection efficiency in the 1-30 DPD bucket.',
  },
  {
    user: 'Compare trade finance exposure across all subsidiaries',
    ai: 'Trade finance outstanding by subsidiary:\n- Beltone: $45.2M (32% of group)\n- FWBL: $38.1M (27%)\n- Mirabank: $28.5M (20%)\n- LuloBank: $18.3M (13%)\n- Samman Capital: $11.2M (8%)\n\nBeltone has the highest concentration with 3 facilities on watchlist. Stage 2+3 exposure is highest at Mirabank (8.2%).',
  },
];

export function AIAssistant() {
  return (
    <PRDSection id="ai-assistant" title="AI Assistant" sectionNumber={11}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform integrates a conversational AI assistant powered by GPT-4.1 (via the KIE.ai proxy)
        that enables natural language querying of portfolio data. The assistant is scope-aware — it factors
        in the user&apos;s current Group/Region/Subsidiary selection when generating responses, ensuring
        answers reflect the relevant data context. It acts as a senior credit analyst, providing
        data-driven insights with specific numbers from the portfolio.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>Capabilities</Typography>
            <List dense disablePadding>
              {[
                'Natural language queries about portfolio KPIs, trends, and risk metrics',
                'Scope-aware responses automatically filtered to current Group/Region/Subsidiary selection',
                'Context-rich: queries 11 data sources in parallel (scorecard, consumer, trade, corporate, EWS, watchlist)',
                'Suggested starter questions for quick insights',
                'Multi-turn conversational follow-up within session',
                'Drawer-based UI (420px right panel) for non-intrusive, side-by-side interaction',
                'Loading indicators during response generation',
                'Markdown-formatted responses for readability',
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

      <DiagramBox title="AI Query Flow — How It Works">
{`  User Action                  System Response
  ──────────                   ───────────────
  Opens AI panel          ───▶  Drawer slides in (420px)
                                Suggested questions displayed

  Selects/types question  ───▶  POST /api/gemini
                                ├── Current scope (Group/Region/Sub) attached
                                ├── 11 parallel DB queries execute:
                                │   ├── Consolidated scorecard
                                │   ├── Consumer overall metrics
                                │   ├── Consumer product metrics
                                │   ├── Trade entity performance
                                │   ├── Trade asset quality
                                │   ├── Corporate portfolio metrics
                                │   ├── Corporate watchlist
                                │   ├── EWS entity summary
                                │   ├── EWS facility alerts
                                │   ├── FX risk data
                                │   └── Country risk data
                                └── Rich markdown context built

  Waits for response      ───▶  GPT-4.1 processes query + context
                                System prompt: "Senior credit analyst"
                                Loading indicator shown

  Reads response          ───▶  Formatted answer displayed
                                Specific numbers cited from data
                                RAG statuses highlighted

  Asks follow-up          ───▶  Conversation continues
                                Previous context preserved`}
      </DiagramBox>

      <Typography variant="h6" sx={{ fontSize: '1rem', mt: 3, mb: 1.5 }}>Example Conversations</Typography>
      {EXAMPLE_CONVERSATIONS.map((conv, i) => (
        <Card key={i} sx={{ p: 2, mb: 1.5, bgcolor: 'action.hover' }}>
          <Box sx={{ mb: 1.5 }}>
            <Chip label="You" size="small" color="primary" sx={{ fontSize: '0.68rem', mr: 1 }} />
            <Typography variant="body2" component="span" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{conv.user}</Typography>
          </Box>
          <Box>
            <Chip label="AI" size="small" variant="outlined" sx={{ fontSize: '0.68rem', mr: 1 }} />
            <Typography variant="body2" component="span" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-line', color: 'text.secondary' }}>{conv.ai}</Typography>
          </Box>
        </Card>
      ))}

      <Typography variant="h6" sx={{ fontSize: '1rem', mt: 3, mb: 1.5 }}>Limitations</Typography>
      <List dense disablePadding>
        {[
          'Responses are based on the latest data in the database — not real-time streaming',
          'The AI does not have access to historical trends beyond what is stored in summary tables',
          'Complex multi-step analyses (e.g., "run a stress test") are not supported — use the Forward Outlook tab instead',
          'The assistant cannot modify data or trigger actions — it is read-only',
          'Session history is not persisted across page reloads',
        ].map((lim, i) => (
          <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
            </ListItemIcon>
            <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{lim}</Typography>} />
          </ListItem>
        ))}
      </List>
    </PRDSection>
  );
}
