'use client';

import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { APP_VERSION } from '@/lib/version';

export const PRD_SECTIONS = [
  { id: 'executive-summary', title: 'Executive Summary', number: 1 },
  { id: 'problem-statement', title: 'Problem Statement', number: 2 },
  { id: 'target-users', title: 'Target Users & Personas', number: 3 },
  { id: 'goals-metrics', title: 'Goals & Success Metrics', number: 4 },
  { id: 'product-overview', title: 'Product Overview', number: 5 },
  { id: 'feature-inventory', title: 'Feature Inventory', number: 6 },
  { id: 'data-architecture', title: 'Data Architecture', number: 7 },
  { id: 'risk-appetite', title: 'Risk Appetite Framework', number: 8 },
  { id: 'user-flows', title: 'User Flows', number: 9 },
  { id: 'export-reporting', title: 'Export & Reporting', number: 10 },
  { id: 'ai-assistant', title: 'AI Assistant', number: 11 },
  { id: 'access-control', title: 'Access Control', number: 12 },
  { id: 'technical-stack', title: 'Technical Stack', number: 13 },
  { id: 'nonfunctional', title: 'Non-Functional Requirements', number: 14 },
  { id: 'roadmap', title: 'Roadmap', number: 15 },
  { id: 'appendices', title: 'Appendices', number: 16 },
] as const;

interface Props {
  activeId: string;
  onNavigate: (id: string) => void;
}

export function TableOfContents({ activeId, onNavigate }: Props) {
  return (
    <Box sx={{ py: 3, px: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 1, px: 1.5 }}
      >
        Documentation
      </Typography>

      <List dense sx={{ flex: 1, overflow: 'auto', mx: -0.5 }}>
        {PRD_SECTIONS.map((s) => {
          const isActive = activeId === s.id;
          return (
            <ListItemButton
              key={s.id}
              onClick={() => onNavigate(s.id)}
              sx={{
                borderRadius: 1,
                mb: 0.25,
                py: 0.5,
                px: 1.5,
                borderLeft: isActive ? '3px solid' : '3px solid transparent',
                borderColor: isActive ? 'primary.main' : 'transparent',
                bgcolor: isActive ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemText
                primary={
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'primary.main' : 'text.secondary',
                      lineHeight: 1.4,
                    }}
                  >
                    {s.number}. {s.title}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ pt: 2, px: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
          Baobab Portfolio Monitor v{APP_VERSION}
        </Typography>
      </Box>
    </Box>
  );
}
