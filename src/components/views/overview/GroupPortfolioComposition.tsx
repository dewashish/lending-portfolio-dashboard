'use client';

import { Box } from '@mui/material';
import { BusinessLineDonut } from '@/components/charts/BusinessLineDonut';
import { SubsidiaryAUMBar, type SubsidiaryAUM } from '@/components/charts/SubsidiaryAUMBar';
import { StagingDonut } from '@/components/charts/StagingDonut';
import type { ConsolidatedScorecardRow } from '@/lib/queries/overview';
import type { AssetQualityByEntity, RAGStatus, ScopeSelection } from '@/lib/types';

interface Props {
  scorecard: ConsolidatedScorecardRow[];
  consumerAum: number;
  tradeOutstanding: number;
  corporatePOS: number;
  tradeAssetQuality: AssetQualityByEntity[];
  corporatePOSBySubsidiary?: Record<number, number>;
  corporateStageBalances?: { stage1: number; stage2: number; stage3: number };
  onTabChange?: (tabIndex: number) => void;
  onScopeChange?: (scope: ScopeSelection) => void;
}

export function GroupPortfolioComposition({
  scorecard,
  consumerAum,
  tradeOutstanding,
  corporatePOS,
  tradeAssetQuality,
  corporatePOSBySubsidiary = {},
  corporateStageBalances,
  onTabChange,
  onScopeChange,
}: Props) {
  const segmentToTab = (seg: 'consumer' | 'trade' | 'corporate') => {
    const map = { consumer: 1, trade: 3, corporate: 2 };
    onTabChange?.(map[seg]);
  };

  const subsidiaryBars: SubsidiaryAUM[] = scorecard.map(s => ({
    name: s.subsidiary,
    shortCode: s.shortCode,
    subsidiaryId: s.subsidiaryId,
    aum: (s.consumerAumUsd ?? 0) + (s.tradeOutstandingUsd ?? 0) + (corporatePOSBySubsidiary[s.subsidiaryId] ?? 0),
    rag: (s.ewsRagStatus as RAGStatus) ?? 'Green',
  }));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
      <Box sx={{ minHeight: 360 }}>
        <BusinessLineDonut
          consumer={consumerAum}
          trade={tradeOutstanding}
          corporate={corporatePOS}
          onSegmentClick={segmentToTab}
        />
      </Box>
      <Box sx={{ minHeight: 360 }}>
        <SubsidiaryAUMBar
          data={subsidiaryBars}
          onBarClick={(subId) => onScopeChange?.({ level: 'subsidiary', subsidiaryId: subId })}
        />
      </Box>
      <Box sx={{ minHeight: 360 }}>
        <StagingDonut data={tradeAssetQuality} corporateStages={corporateStageBalances} />
      </Box>
    </Box>
  );
}
