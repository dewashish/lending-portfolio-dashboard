'use client';

import { Typography, Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const PAIN_POINTS = [
  {
    title: 'Fragmented Risk Visibility Across Geographies',
    desc: 'Group CROs lack a consolidated view of portfolio health across subsidiaries operating in different countries, currencies, and regulatory environments. Risk data lives in siloed spreadsheets per entity, making group-level trend analysis manual and error-prone.',
  },
  {
    title: 'Manual Portfolio Quality Report (PQR) Preparation',
    desc: 'Monthly PQR decks take 3-5 business days to compile. Analysts manually pull data from multiple systems, format it into Excel templates, and generate charts — a process that delays board-level decision making and introduces reconciliation errors.',
  },
  {
    title: 'No Real-Time Risk Appetite Breach Alerting',
    desc: 'Risk appetite thresholds exist on paper but are checked retrospectively. There is no system that continuously monitors KPIs against defined appetite and tolerance limits, or alerts stakeholders when breaches occur at any scope level.',
  },
  {
    title: 'Siloed Consumer, Trade, and Corporate Portfolio Views',
    desc: 'Each business line has its own reporting format and cadence. There is no unified platform that allows a CRO to compare asset quality, delinquency trends, and concentration risks across consumer, trade, and corporate books simultaneously.',
  },
  {
    title: 'No Standardized Early Warning System (EWS) Framework',
    desc: 'Early warning signals are tracked inconsistently across subsidiaries. There is no group-wide EWS scoring model that aggregates facility-level alerts, enables proactive intervention, and tracks the effectiveness of remedial actions.',
  },
];

export function ProblemStatement() {
  return (
    <PRDSection id="problem-statement" title="Problem Statement" sectionNumber={2}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        Multi-geography financial holding companies face systemic challenges in monitoring and managing
        credit risk across their lending portfolios. The following pain points drive the need for a
        centralized portfolio risk management platform:
      </Typography>

      <List disablePadding>
        {PAIN_POINTS.map((p, i) => (
          <ListItem key={i} alignItems="flex-start" sx={{ px: 0, py: 1 }}>
            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {p.title}
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {p.desc}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </PRDSection>
  );
}
