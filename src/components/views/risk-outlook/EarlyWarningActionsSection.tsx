'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Grid,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { MacroEWSSection } from '@/components/views/risk-outlook/MacroEWSSection';
import { useManagementActions, useLeadingIndicators } from '@/hooks/useRiskOutlookData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#d32f2f',
  High: '#f44336',
  Medium: '#ff9800',
  Low: '#78909c',
};

const STATUS_COLORS: Record<string, string> = {
  Open: '#f44336',
  'In Progress': '#ff9800',
  Completed: '#4caf50',
};

const RAG_COLORS: Record<string, string> = {
  Red: '#f44336',
  Amber: '#ff9800',
  Green: '#4caf50',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  underwriting: 'Underwriting',
  pricing: 'Pricing',
  collections: 'Collections',
  provisioning: 'Provisioning',
  capital: 'Capital',
  portfolio: 'Portfolio',
};

export function EarlyWarningActionsSection({ scope }: Props) {
  const { data: actions, isLoading: l1 } = useManagementActions(scope);
  const { data: indicators, isLoading: l2 } = useLeadingIndicators(scope);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // EWS summary counts
  const ewsSummary = useMemo(() => {
    if (!indicators) return { red: 0, amber: 0, green: 0 };
    return {
      red: indicators.filter((i) => i.ragStatus === 'Red').length,
      amber: indicators.filter((i) => i.ragStatus === 'Amber').length,
      green: indicators.filter((i) => i.ragStatus === 'Green').length,
    };
  }, [indicators]);

  // Available categories
  const categories = useMemo(() => {
    if (!actions) return [];
    return Array.from(new Set(actions.map((a) => a.actionCategory))).sort();
  }, [actions]);

  // Filtered actions
  const filteredActions = useMemo(() => {
    if (!actions) return [];
    if (categoryFilter === 'all') return actions;
    return actions.filter((a) => a.actionCategory === categoryFilter);
  }, [actions, categoryFilter]);

  // Action summary
  const actionSummary = useMemo(() => {
    if (!actions) return { critical: 0, high: 0, medium: 0, low: 0, open: 0, inProgress: 0 };
    return {
      critical: actions.filter((a) => a.priority === 'Critical').length,
      high: actions.filter((a) => a.priority === 'High').length,
      medium: actions.filter((a) => a.priority === 'Medium').length,
      low: actions.filter((a) => a.priority === 'Low').length,
      open: actions.filter((a) => a.status === 'Open').length,
      inProgress: actions.filter((a) => a.status === 'In Progress').length,
    };
  }, [actions]);

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Alert Summary Bar ─────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Card sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 120 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336' }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>EWS Red</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace', color: '#f44336' }}>
            {ewsSummary.red}
          </Typography>
        </Card>
        <Card sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 120 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff9800' }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>EWS Amber</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace', color: '#ff9800' }}>
            {ewsSummary.amber}
          </Typography>
        </Card>
        <Card sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 120 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50' }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>EWS Green</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace', color: '#4caf50' }}>
            {ewsSummary.green}
          </Typography>
        </Card>
        <Card sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 120 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Critical Actions</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace', color: '#d32f2f' }}>
            {actionSummary.critical}
          </Typography>
        </Card>
        <Card sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 120 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Open Actions</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace' }}>
            {actionSummary.open}
          </Typography>
        </Card>
      </Box>

      {/* ── Early Warning System ──────────────────────────────── */}
      <MacroEWSSection scope={scope} />

      <Divider />

      {/* ── Management Action Playbook ────────────────────────── */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>
          Management Action Playbook
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mb: 1.5 }}>
          Prescribed actions triggered by EWS alerts, stress test results, and portfolio signals.
        </Typography>

        {/* Category Filter */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={categoryFilter}
          onChange={(_, v) => { if (v !== null) setCategoryFilter(v); }}
          sx={{
            mb: 2,
            flexWrap: 'wrap',
            '& .MuiToggleButton-root': { fontSize: '0.65rem', py: 0.3, px: 1.2, textTransform: 'none', fontWeight: 600 },
          }}
        >
          <ToggleButton value="all">All ({actions?.length ?? 0})</ToggleButton>
          {categories.map((c) => (
            <ToggleButton key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c} ({actions?.filter((a) => a.actionCategory === c).length ?? 0})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Action Cards */}
        <Grid container spacing={1.5}>
          {filteredActions.map((action) => (
            <Grid item xs={12} sm={6} md={4} key={action.id}>
              <Card sx={{ p: 1.5, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                {/* Header: RAG + Priority */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Chip
                    label={action.ragStatus}
                    size="small"
                    sx={{
                      fontSize: '0.58rem',
                      height: 18,
                      bgcolor: RAG_COLORS[action.ragStatus] ?? '#9e9e9e',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    label={action.priority}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.58rem',
                      height: 18,
                      borderColor: PRIORITY_COLORS[action.priority] ?? '#9e9e9e',
                      color: PRIORITY_COLORS[action.priority] ?? '#9e9e9e',
                      fontWeight: 700,
                    }}
                  />
                </Box>

                {/* Trigger */}
                <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  Trigger: {action.triggerIndicator}
                </Typography>

                {/* Action Description */}
                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, lineHeight: 1.4 }}>
                  {action.actionDescription}
                </Typography>

                {/* Footer: Category, Owner, Deadline, Status */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  <Chip
                    label={CATEGORY_LABELS[action.actionCategory] ?? action.actionCategory}
                    size="small"
                    sx={{ fontSize: '0.55rem', height: 16, bgcolor: 'action.hover' }}
                  />
                  {action.owner && (
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      {action.owner}
                    </Typography>
                  )}
                  {action.deadline && (
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      | {action.deadline}
                    </Typography>
                  )}
                  <Chip
                    label={action.status}
                    size="small"
                    sx={{
                      fontSize: '0.55rem',
                      height: 16,
                      ml: 'auto',
                      bgcolor: STATUS_COLORS[action.status] ?? '#9e9e9e',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredActions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No actions found for the selected filter.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
