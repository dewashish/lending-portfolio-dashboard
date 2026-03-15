'use client';

import { useState, useMemo } from 'react';
import { Box, Typography, Drawer, IconButton, Divider, Chip, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SubsidiaryRiskHeatmap, type RiskHeatmapCell } from '@/components/charts/SubsidiaryRiskHeatmap';
import { useSubsidiaryStressScores } from '@/hooks/useRiskOutlookData';
import { useSubsidiaries } from '@/hooks/useConsumerData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection, RAGStatus } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const DIMENSION_LABELS: Record<string, string> = {
  macro_outlook: 'Macro Outlook',
  portfolio_vulnerability: 'Portfolio Vulnerability',
  collections_effectiveness: 'Collections Effectiveness',
  provision_adequacy: 'Provision Adequacy',
  capital_absorption: 'Capital Absorption',
};

const DIMENSION_ORDER = [
  'macro_outlook',
  'portfolio_vulnerability',
  'collections_effectiveness',
  'provision_adequacy',
  'capital_absorption',
];

const RAG_COLORS: Record<string, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

interface DrawerState {
  open: boolean;
  subsidiary: string;
  dimension: string;
  score: number;
  ragStatus: string;
  drivers: { label: string; detail: string }[];
}

export function StressHeatmapSection({ scope }: Props) {
  const { data: scores, isLoading: l1 } = useSubsidiaryStressScores(scope);
  const { data: subsidiaries, isLoading: l2 } = useSubsidiaries();

  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    subsidiary: '',
    dimension: '',
    score: 0,
    ragStatus: 'Green',
    drivers: [],
  });

  const subMap = useMemo(() => {
    if (!subsidiaries) return new Map<number, string>();
    return new Map(subsidiaries.map((s) => [s.id, s.name]));
  }, [subsidiaries]);

  const { cells, subNames, dimLabels } = useMemo(() => {
    if (!scores || scores.length === 0) return { cells: [], subNames: [], dimLabels: [] };

    const subIds = Array.from(new Set(scores.map((s) => s.subsidiaryId)));
    const names = subIds.map((id) => subMap.get(id) ?? `Sub ${id}`);
    const dims = DIMENSION_ORDER.filter((d) => scores.some((s) => s.dimension === d));
    const labels = dims.map((d) => DIMENSION_LABELS[d] ?? d);

    const heatmapCells: RiskHeatmapCell[] = scores
      .filter((s) => dims.includes(s.dimension))
      .map((s) => ({
        subsidiary: subMap.get(s.subsidiaryId) ?? `Sub ${s.subsidiaryId}`,
        subsidiaryId: s.subsidiaryId,
        dimension: DIMENSION_LABELS[s.dimension] ?? s.dimension,
        formattedValue: `${Math.round(s.score)}`,
        rag: s.ragStatus as RAGStatus,
        tabIndex: 5, // Forward Outlook tab
        subTabIndex: 2, // Scenario Engine
      }));

    return { cells: heatmapCells, subNames: names, dimLabels: labels };
  }, [scores, subMap]);

  const handleCellClick = (subsidiaryId: number) => {
    if (!scores) return;
    // Find the score for this subsidiary and show its drivers
    const cellScores = scores.filter((s) => s.subsidiaryId === subsidiaryId);
    if (cellScores.length === 0) return;

    // Show aggregate drawer for the subsidiary
    const subName = subMap.get(subsidiaryId) ?? `Sub ${subsidiaryId}`;
    setDrawer({
      open: true,
      subsidiary: subName,
      dimension: 'All Dimensions',
      score: Math.round(cellScores.reduce((s, c) => s + c.score, 0) / cellScores.length),
      ragStatus: cellScores.some((c) => c.ragStatus === 'Red') ? 'Red'
        : cellScores.some((c) => c.ragStatus === 'Amber') ? 'Amber' : 'Green',
      drivers: cellScores.flatMap((c) => {
        const dimLabel = DIMENSION_LABELS[c.dimension] ?? c.dimension;
        return c.drivers.map((d) => ({ label: `[${dimLabel}] ${d.label}`, detail: d.detail }));
      }),
    });
  };

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          Subsidiary Stress Scoring
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Each subsidiary scored 0–100 on 5 risk dimensions. Click a row to see detailed drivers.
        </Typography>
      </Box>

      {/* RAG Legend */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {[
          { label: 'Green (65–100)', color: '#4caf50' },
          { label: 'Amber (40–64)', color: '#ff9800' },
          { label: 'Red (0–39)', color: '#f44336' },
        ].map((l) => (
          <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: l.color }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              {l.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <SubsidiaryRiskHeatmap
        cells={cells}
        subsidiaries={subNames}
        dimensions={dimLabels}
        onCellClick={handleCellClick}
      />

      {/* Driver Drill-Down Drawer */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        PaperProps={{ sx: { width: 400, maxWidth: '90vw', p: 3 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {drawer.subsidiary}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {drawer.dimension}
            </Typography>
          </Box>
          <IconButton onClick={() => setDrawer((prev) => ({ ...prev, open: false }))} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace' }}>
            {drawer.score}
          </Typography>
          <Chip
            label={drawer.ragStatus}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: RAG_COLORS[drawer.ragStatus] ?? '#9e9e9e',
              color: '#fff',
            }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
          Risk Drivers
        </Typography>

        <List dense disablePadding>
          {drawer.drivers.map((d, i) => (
            <ListItem key={i} sx={{ py: 0.5, px: 0, alignItems: 'flex-start' }}>
              <ListItemText
                primary={d.label}
                secondary={d.detail}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600, fontSize: '0.78rem' }}
                secondaryTypographyProps={{ variant: 'caption', fontSize: '0.7rem', mt: 0.3 }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}
