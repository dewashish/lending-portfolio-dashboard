'use client';

import { Box, Typography, Card } from '@mui/material';
import { TDDTable } from '@/components/tables/TDDTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useTDDPre, useTDDPost } from '@/hooks/useConsumerData';

export function ConsumerTDDSection() {
  const { data: pre, isLoading: l1 } = useTDDPre();
  const { data: post, isLoading: l2 } = useTDDPost();

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Pre-Disbursal TDD Analysis
        </Typography>
        <TDDTable data={pre ?? []} variant="pre" />
      </Card>

      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Post-Disbursal TDD Analysis
        </Typography>
        <TDDTable data={post ?? []} variant="post" />
      </Card>
    </Box>
  );
}
