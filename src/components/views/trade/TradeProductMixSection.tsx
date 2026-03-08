'use client';

import { Grid } from '@mui/material';
import { ProductMixTable } from '@/components/tables/ProductMixTable';
import { RatingDistributionBar } from '@/components/charts/RatingDistributionBar';
import { useTradeProductMix, useTradeRatingDistribution } from '@/hooks/useTradeData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeProductMixSection({ scope }: Props) {
  const { data: productMix, isLoading: loadingMix } = useTradeProductMix(scope);
  const { data: ratings, isLoading: loadingRatings } = useTradeRatingDistribution(scope);

  if (loadingMix || loadingRatings) return <LoadingSkeleton />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <ProductMixTable data={productMix ?? []} />
      </Grid>
      <Grid item xs={12} md={5}>
        <RatingDistributionBar data={ratings ?? []} />
      </Grid>
    </Grid>
  );
}
