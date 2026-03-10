'use client';

import { Box, Grid, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { MigrationMatrixHeatmap } from '@/components/charts/MigrationMatrixHeatmap';
import { PDTermStructure } from '@/components/charts/PDTermStructure';
import {
  usePDMigrationMatrix,
  usePDTermStructure,
  useRatingDistribution,
} from '@/hooks/useRiskOutlookData';
import { RatingDistributionBar } from '@/components/views/risk-outlook/RatingDistributionBar';
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

export function PDMigrationSection({ scope }: Props) {
  const { data: matrixData } = usePDMigrationMatrix(scope);
  const { data: termData } = usePDTermStructure(scope);
  const { data: distData } = useRatingDistribution(scope);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Grid container spacing={2.5}>
        {/* Migration Matrix */}
        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Forward PD migration matrix adjusted by Z-factor for current credit cycle conditions. Default (D) is absorbing." />
            </Box>
            <MigrationMatrixHeatmap data={matrixData ?? []} />
          </Box>
        </Grid>

        {/* PD Term Structure */}
        <Grid item xs={12} md={6}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Cumulative PD derived from forward migration matrix. Conditional independence assumed across annual horizons." />
            </Box>
            <PDTermStructure data={termData ?? []} />
          </Box>
        </Grid>

        {/* Rating Distribution Shift */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <MethodologyTooltip text="Projected rating shift using forward migration matrix, adjusted for 15% new originations at BBB quality." />
            </Box>
            <RatingDistributionBar data={distData ?? []} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
