'use client';

import { Box, Grid, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ScenarioLossHeatmap } from '@/components/charts/ScenarioLossHeatmap';
import { CET1TrajectoryChart } from '@/components/charts/CET1TrajectoryChart';
import { SensitivityTornado } from '@/components/charts/SensitivityTornado';
import {
  useStressScenarioLosses,
  useCET1Trajectory,
  useEclSensitivity,
} from '@/hooks/useRiskOutlookData';
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

export function StressTestingSection({ scope }: Props) {
  const { data: lossData } = useStressScenarioLosses(scope);
  const { data: cet1Data } = useCET1Trajectory(scope);
  const { data: sensitivityData } = useEclSensitivity(scope);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Grid container spacing={2.5}>
        {/* Scenario Loss Heatmap */}
        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Credit losses under 4 macro scenarios. Stressed PD = Base PD × scenario multiplier." />
            </Box>
            <ScenarioLossHeatmap data={lossData ?? []} />
          </Box>
        </Grid>

        {/* CET1 Trajectory */}
        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="CET1 ratio path under stress. Static balance sheet, no management actions assumed. Thresholds at 4.5% and 8%." />
            </Box>
            <CET1TrajectoryChart data={cet1Data ?? []} />
          </Box>
        </Grid>

        {/* Sensitivity Tornado */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Each macro factor shocked independently. Impact = (Shocked ECL − Base ECL) / Base ECL." />
            </Box>
            <SensitivityTornado data={sensitivityData ?? []} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
