'use client';

import { useState } from 'react';
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
  IconButton,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { METHODOLOGY_SECTIONS, METHODOLOGY_REFERENCES } from '@/lib/risk-outlook-methodology';

const RELEVANT_IDS = ['ecl-forecast', 'provision-coverage', 'vintage-delinquency', 'scenario-loss-matrix'];

const SUB_TAB_COLORS: Record<string, string> = {
  'ECL & Provisions': '#2196f3',
  'Stress Testing': '#f44336',
  'Vintage Forecast': '#4caf50',
};

export function FilteredMethodologySection() {
  const [expanded, setExpanded] = useState(false);
  const filtered = METHODOLOGY_SECTIONS.filter((s) => RELEVANT_IDS.includes(s.id));

  return (
    <Card sx={{ p: 2.5 }}>
      {/* Clickable header */}
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <MenuBookIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1.5 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Methodology & Assumptions
          </Typography>
          {!expanded && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.25 }}>
              ECL Forecast, Provision Coverage, Delinquency, Scenario Analysis
            </Typography>
          )}
        </Box>
        <IconButton size="small" sx={{ ml: 1 }}>
          {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>

      {/* Collapsible body */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 800 }}>
            Assumptions, calculation methods, and limitations for the forward-looking analyses displayed above.
          </Typography>

          {/* Filtered accordion entries */}
          {filtered.map((entry) => (
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
                            primary={`\u2022 ${d}`}
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
                            primary={`\u26A0 ${l}`}
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

          {/* References card */}
          <Card sx={{ p: 2.5, mt: 2 }}>
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
      </Collapse>
    </Card>
  );
}
