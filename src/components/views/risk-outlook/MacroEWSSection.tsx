'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { MacroCreditLinkage } from '@/components/charts/MacroCreditLinkage';
import { useLeadingIndicators, useMacroCreditLinkage } from '@/hooks/useRiskOutlookData';
import { formatNumber } from '@/lib/format';
import type { ScopeSelection, LeadingIndicatorRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const RAG_CHIP_COLORS: Record<string, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUpIcon sx={{ fontSize: 16 }} />;
  if (trend === 'down') return <TrendingDownIcon sx={{ fontSize: 16 }} />;
  return <TrendingFlatIcon sx={{ fontSize: 16 }} />;
}

function IndicatorCard({ indicator }: { indicator: LeadingIndicatorRow }) {
  return (
    <Card sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
          {indicator.indicatorName}
        </Typography>
        <Chip
          label={indicator.ragStatus}
          size="small"
          sx={{
            fontSize: '0.6rem',
            height: 18,
            bgcolor: RAG_CHIP_COLORS[indicator.ragStatus] ?? '#9e9e9e',
            color: '#fff',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'IBM Plex Mono, monospace' }}>
          {formatNumber(indicator.currentValue, 2)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary' }}>
          <TrendIcon trend={indicator.trend} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
            z={formatNumber(indicator.zScore, 1)}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>
        {indicator.category}
      </Typography>
    </Card>
  );
}

function MethodologyTooltip({ text }: { text: string }) {
  return (
    <Tooltip arrow title={<>{text}<br /><em>See Methodology tab for full details.</em></>}>
      <IconButton size="small" sx={{ p: 0.3 }}>
        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
      </IconButton>
    </Tooltip>
  );
}

export function MacroEWSSection({ scope }: Props) {
  const { data: indicators } = useLeadingIndicators(scope);
  const { data: linkageData } = useMacroCreditLinkage(scope);
  const [macroVar, setMacroVar] = useState<string>('');

  const macroVariables = Array.from(new Set((linkageData ?? []).map((d) => d.macroVariable)));
  const activeMacroVar = macroVar || macroVariables[0] || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Leading Indicators Scorecard */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            Leading Indicators Scorecard
          </Typography>
          <MethodologyTooltip text="Z-score vs trailing 36-month distribution. RAG: Green |z|<1, Amber 1≤|z|<2, Red |z|≥2." />
        </Box>
        <Grid container spacing={1.5}>
          {(indicators ?? []).map((ind) => (
            <Grid item xs={6} sm={4} md={3} key={ind.indicatorName}>
              <IndicatorCard indicator={ind} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Macro-Credit Linkage */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            Macro-Credit Linkage
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Macro Variable</InputLabel>
            <Select
              value={activeMacroVar}
              label="Macro Variable"
              onChange={(e) => setMacroVar(e.target.value)}
            >
              {macroVariables.map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <MethodologyTooltip text="Lead-lag relationships calibrated from 5+ years of cross-correlation analysis. Current macro readings imply future credit trajectory." />
        </Box>
        <MacroCreditLinkage data={linkageData ?? []} macroVariable={activeMacroVar} />
      </Box>
    </Box>
  );
}
