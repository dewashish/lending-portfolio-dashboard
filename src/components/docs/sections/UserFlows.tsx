'use client';

import { Typography, Box, Card, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

interface UserFlow {
  title: string;
  persona: string;
  steps: { label: string; desc: string }[];
}

const FLOWS: UserFlow[] = [
  {
    title: 'Scope Navigation',
    persona: 'Group CRO',
    steps: [
      { label: 'Select scope level', desc: 'Toggle between Group, Region, or Subsidiary using the scope buttons in the AppBar.' },
      { label: 'Choose entity (if Region/Subsidiary)', desc: 'A dropdown appears showing available regions or subsidiaries with short codes and currencies.' },
      { label: 'Dashboard updates', desc: 'All tabs, charts, tables, KPIs, and exports instantly re-render filtered to the selected scope. SWR cache keys change to isolate scope-level data.' },
      { label: 'Drill-down or drill-up', desc: 'Click a subsidiary on the risk heatmap or AUM bar to drill into it. Click "Group" to drill back up.' },
    ],
  },
  {
    title: 'Risk Drill-Down',
    persona: 'Group CRO / Subsidiary CRO',
    steps: [
      { label: 'View risk heatmap', desc: 'On Group Overview, the 7-dimension risk heatmap shows each subsidiary as a row with color-coded risk cells.' },
      { label: 'Click a heatmap cell', desc: 'Clicking a cell (e.g., "Trade NPL" for "Beltone") sets the scope to that subsidiary and navigates to the relevant tab.' },
      { label: 'Analyze sub-tabs', desc: 'Within the target tab, navigate sub-tabs to find the root cause (e.g., Trade > EWS & Migration > Stage migration matrix).' },
      { label: 'Check breach alerts', desc: 'BreachBadge components on KPIs show if the metric is within appetite (Green), breaching appetite (Amber), or breaching tolerance (Red).' },
    ],
  },
  {
    title: 'Risk Appetite Configuration',
    persona: 'Super Admin',
    steps: [
      { label: 'Open Risk Appetite drawer', desc: 'Click the Settings (gear) icon in the AppBar to open the Risk Appetite Drawer.' },
      { label: 'Authenticate via PIN', desc: 'Enter the admin PIN in the PinDialog to unlock editing capabilities.' },
      { label: 'Select scope and metric', desc: 'Choose scope level (Global/Region/Subsidiary/Business Line/Product), then browse or search for the metric to configure.' },
      { label: 'Edit thresholds', desc: 'Modify the appetite and tolerance values. Inherited thresholds are shown with an "Inherited" chip — editing creates an override at the current scope level.' },
      { label: 'Save and verify', desc: 'Save the threshold. The dashboard immediately re-computes RAG statuses and updates breach alerts across all views.' },
    ],
  },
  {
    title: 'Export Reports',
    persona: 'Product Analyst / CRO',
    steps: [
      { label: 'Navigate to desired tab and scope', desc: 'Select the scope (Group/Region/Subsidiary) and the tab (Group Overview, Consumer, Trade, Corporate, Risk) containing the data to export.' },
      { label: 'Click Export button', desc: 'In the AppBar export area, choose either "Executive Summary" (PDF) or "Excel Export" (PQR).' },
      { label: 'Report generates', desc: 'The export engine queries the current scope data and generates a formatted document. A spinner indicates progress.' },
      { label: 'Download file', desc: 'The browser downloads the file automatically. PDF contains a formatted summary; Excel contains tabular PQR data for the selected tab.' },
    ],
  },
  {
    title: 'AI Query',
    persona: 'Any user',
    steps: [
      { label: 'Open AI panel', desc: 'Click the AI (AutoAwesome) icon in the AppBar to open the query drawer on the right side (420px).' },
      { label: 'Ask a question', desc: 'Select from 6 suggested questions or type a custom question in the input field. Questions are scope-aware.' },
      { label: 'View response', desc: 'The AI assistant (powered by Gemini) processes the query with the current portfolio data context and returns an analysis.' },
      { label: 'Follow up', desc: 'Continue the conversation with follow-up questions. The chat history is maintained within the session.' },
    ],
  },
];

export function UserFlows() {
  return (
    <PRDSection id="user-flows" title="User Flows" sectionNumber={9}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        The following key user flows represent the primary interaction patterns within the platform.
        Each flow is designed to minimize clicks-to-insight and leverage the hierarchical scope model.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {FLOWS.map((flow) => (
          <Card key={flow.title} sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{flow.title}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>({flow.persona})</Typography>
            </Box>
            <Stepper orientation="vertical" activeStep={-1}>
              {flow.steps.map((step) => (
                <Step key={step.label} active expanded>
                  <StepLabel>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{step.label}</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6 }}>
                      {step.desc}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Card>
        ))}
      </Box>
    </PRDSection>
  );
}
