'use client';

import { Box, Grid, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { VintageProjectionChart } from '@/components/charts/VintageProjectionChart';
import { RollRateForecastHeatmap } from '@/components/charts/RollRateForecastHeatmap';
import { useVintageForecast, useRollRateForecast } from '@/hooks/useRiskOutlookData';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
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

export function VintageForecastSection({ scope }: Props) {
  const { data: vintageData } = useVintageForecast(scope);
  const { data: rollRateData } = useRollRateForecast(scope);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Grid container spacing={2.5}>
        {/* Vintage Projection Curves */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="90+ DPD by MOB with logistic curve projection. Macro adjustment = (forecast unemployment / current)^elasticity." />
            </Box>
            <VintageProjectionChart data={vintageData ?? []} />
          </Box>
        </Grid>

        {/* Roll Rate Forecast */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Markov chain roll rates. Month 1 = trailing 3-month avg. Trend factor shifts rates by 2-5% per month in deteriorating conditions." />
            </Box>
            <RollRateForecastHeatmap data={rollRateData ?? []} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
