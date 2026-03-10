'use client';

import { useState } from 'react';
import { Box, Grid, FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ECLStackedArea } from '@/components/charts/ECLStackedArea';
import { ECLWaterfall } from '@/components/charts/ECLWaterfall';
import { useEclForecast, useEclWaterfall } from '@/hooks/useRiskOutlookData';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

const SCENARIOS = ['Base', 'Adverse', 'Severe'] as const;

function MethodologyTooltip({ text }: { text: string }) {
  return (
    <Tooltip arrow title={<>{text}<br /><em>See Methodology tab for full details.</em></>}>
      <IconButton size="small" sx={{ p: 0.3 }}>
        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
      </IconButton>
    </Tooltip>
  );
}

export function ECLProvisionsSection({ scope }: Props) {
  const [scenario, setScenario] = useState<string>('Base');
  const { data: eclData } = useEclForecast(scope, scenario);
  const { data: waterfallData, isLoading: waterfallLoading } = useEclWaterfall(scope, 'Base');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Scenario selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Scenario</InputLabel>
          <Select value={scenario} label="Scenario" onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <MethodologyTooltip text="ECL projected under IFRS 9 three-stage model. Scenario-weighted: Base 50%, Adverse 30%, Severe 20%." />
      </Box>

      <Grid container spacing={2.5}>
        {/* ECL Stacked Area */}
        <Grid item xs={12} md={7}>
          <Box sx={{ position: 'relative' }}>
            <ECLStackedArea data={eclData ?? []} scenario={scenario} />
          </Box>
        </Grid>

        {/* ECL Waterfall */}
        <Grid item xs={12} md={5}>
          <Box sx={{ position: 'relative' }}>
            {!waterfallLoading && <ECLWaterfall data={waterfallData ?? []} />}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
