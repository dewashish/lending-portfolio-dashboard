'use client';

import { useState } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TimelineIcon from '@mui/icons-material/Timeline';
import { ScenarioImpactTable } from '@/components/views/risk-outlook/ScenarioImpactTable';
import { ECLProvisionsSection } from '@/components/views/risk-outlook/ECLProvisionsSection';
import { StressTestingSection } from '@/components/views/risk-outlook/StressTestingSection';
import { PDMigrationSection } from '@/components/views/risk-outlook/PDMigrationSection';
import { VintageForecastSection } from '@/components/views/risk-outlook/VintageForecastSection';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const SECTIONS = [
  {
    id: 'ecl',
    title: 'ECL & Provisions',
    subtitle: 'Stacked area ECL by stage + waterfall bridge',
    icon: <AccountBalanceIcon sx={{ fontSize: 18 }} />,
    color: '#2196f3',
    defaultExpanded: true,
  },
  {
    id: 'stress',
    title: 'Stress Testing',
    subtitle: 'Scenario losses, CET1 trajectory, sensitivity tornado',
    icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
    color: '#f44336',
    defaultExpanded: false,
  },
  {
    id: 'pd',
    title: 'PD & Migration',
    subtitle: 'Migration matrix, term structure, rating distribution',
    icon: <SwapVertIcon sx={{ fontSize: 18 }} />,
    color: '#ff9800',
    defaultExpanded: false,
  },
  {
    id: 'vintage',
    title: 'Vintage & Roll Rate Forecast',
    subtitle: 'Vintage delinquency curves + roll rate heatmap',
    icon: <TimelineIcon sx={{ fontSize: 18 }} />,
    color: '#4caf50',
    defaultExpanded: false,
  },
] as const;

export function ScenarioEngineSection({ scope }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultExpanded]))
  );

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Scenario Impact Summary Table */}
      <ScenarioImpactTable scope={scope} />

      {/* Accordion Sections */}
      {SECTIONS.map((section) => (
        <Accordion
          key={section.id}
          expanded={expanded[section.id] ?? false}
          onChange={() => toggle(section.id)}
          sx={{
            '&:before': { display: 'none' },
            borderRadius: '8px !important',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
              minHeight: 48,
            }}
          >
            <Chip
              icon={section.icon}
              label={section.title}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: section.color,
                color: '#fff',
                '& .MuiChip-icon': { color: '#fff' },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              {section.subtitle}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1, pb: 2 }}>
            {section.id === 'ecl' && <ECLProvisionsSection scope={scope} />}
            {section.id === 'stress' && <StressTestingSection scope={scope} />}
            {section.id === 'pd' && <PDMigrationSection scope={scope} />}
            {section.id === 'vintage' && <VintageForecastSection scope={scope} />}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
