'use client';

import {
  Box,
  Card,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { METHODOLOGY_SECTIONS, METHODOLOGY_REFERENCES } from '@/lib/risk-outlook-methodology';

const SUB_TAB_ORDER = [
  'Portfolio Health',
  'Stress Heatmap',
  'ECL & Provisions',
  'Stress Testing',
  'PD & Migration',
  'Vintage Forecast',
  'Macro & EWS',
];

const SUB_TAB_COLORS: Record<string, string> = {
  'Portfolio Health': '#1976d2',
  'Stress Heatmap': '#e91e63',
  'ECL & Provisions': '#2196f3',
  'Stress Testing': '#f44336',
  'PD & Migration': '#ff9800',
  'Vintage Forecast': '#4caf50',
  'Macro & EWS': '#9c27b0',
};

export function MethodologySection() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <MenuBookIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Methodology & Assumptions
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 800 }}>
          This section documents the assumptions, calculation methods, data inputs, and limitations
          for every analytical view in the Risk Outlook tab. Each chart in the analytical sub-tabs
          includes an info tooltip linking to the relevant methodology described below.
        </Typography>
      </Card>

      {/* Sections grouped by sub-tab */}
      {SUB_TAB_ORDER.map((subTab) => {
        const entries = METHODOLOGY_SECTIONS.filter((s) => s.subTab === subTab);
        if (entries.length === 0) return null;
        return (
          <Box key={subTab}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  width: 4,
                  height: 20,
                  borderRadius: 1,
                  bgcolor: SUB_TAB_COLORS[subTab] ?? 'primary.main',
                }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {subTab}
              </Typography>
            </Box>

            {entries.map((entry) => (
              <Accordion
                key={entry.id}
                defaultExpanded={false}
                sx={{
                  mb: 1,
                  '&:before': { display: 'none' },
                  borderRadius: '8px !important',
                  overflow: 'hidden',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {entry.title}
                  </Typography>
                  <Chip
                    label={entry.subTab}
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 20,
                      bgcolor: SUB_TAB_COLORS[entry.subTab] ?? 'primary.main',
                      color: '#fff',
                    }}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Description */}
                    <Typography variant="body2" color="text.secondary">
                      {entry.description}
                    </Typography>

                    <Divider />

                    {/* Key Assumptions */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}
                      >
                        Key Assumptions
                      </Typography>
                      <List dense disablePadding sx={{ mt: 0.5 }}>
                        {entry.assumptions.map((a, i) => (
                          <ListItem key={i} sx={{ py: 0.25, px: 0 }}>
                            <ListItemText
                              primary={a}
                              primaryTypographyProps={{ variant: 'body2', fontSize: '0.78rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    {/* Calculation Method */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}
                      >
                        Calculation Method
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.78rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {entry.calculationMethod}
                      </Typography>
                    </Box>

                    {/* Data Inputs */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}
                      >
                        Data Inputs
                      </Typography>
                      <List dense disablePadding sx={{ mt: 0.5 }}>
                        {entry.dataInputs.map((d, i) => (
                          <ListItem key={i} sx={{ py: 0.15, px: 0 }}>
                            <ListItemText
                              primary={`• ${d}`}
                              primaryTypographyProps={{ variant: 'body2', fontSize: '0.75rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    {/* Limitations */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}
                      >
                        Limitations
                      </Typography>
                      <List dense disablePadding sx={{ mt: 0.5 }}>
                        {entry.limitations.map((l, i) => (
                          <ListItem key={i} sx={{ py: 0.15, px: 0 }}>
                            <ListItemText
                              primary={`⚠ ${l}`}
                              primaryTypographyProps={{ variant: 'body2', fontSize: '0.75rem', color: 'warning.main' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    {/* References */}
                    {entry.references.length > 0 && (
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}
                        >
                          References
                        </Typography>
                        <List dense disablePadding sx={{ mt: 0.5 }}>
                          {entry.references.map((r, i) => (
                            <ListItem key={i} sx={{ py: 0.1, px: 0 }}>
                              <ListItemText
                                primary={r}
                                primaryTypographyProps={{ variant: 'body2', fontSize: '0.72rem', fontStyle: 'italic', color: 'text.secondary' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );
      })}

      {/* Global References */}
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1.5 }}>
          References & Standards
        </Typography>
        <List dense disablePadding>
          {METHODOLOGY_REFERENCES.map((ref, i) => (
            <ListItem key={i} sx={{ py: 0.15, px: 0 }}>
              <ListItemText
                primary={`${i + 1}. ${ref}`}
                primaryTypographyProps={{ variant: 'body2', fontSize: '0.75rem', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </Card>
    </Box>
  );
}
