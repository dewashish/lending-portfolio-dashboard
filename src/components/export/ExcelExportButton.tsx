'use client';

import { useState } from 'react';
import { IconButton, CircularProgress, Tooltip } from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import type { ScopeSelection } from '@/lib/types';

function ExcelIcon(props: React.ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 32 32">
      <path d="M28.781 4.405h-10.17V2.018L2 4.588v22.527l16.611 2.868V27.59h10.17A1.149 1.149 0 0 0 30 26.479V5.6a1.149 1.149 0 0 0-1.219-1.195zm.16 22.074H18.611v-2.539h3.837v-1.69h-3.837v-1.272h3.837v-1.69h-3.837v-1.272h3.837v-1.69h-3.837v-1.272h3.837v-1.69h-3.837V12.09h3.837V10.4h-3.837V7.941h10.33z" fill="currentColor"/>
      <path d="M22.448 24.25h4.455v-1.69h-4.455zm0-4.652h4.455v-1.69h-4.455zm0-4.652h4.455v-1.69h-4.455zm0-4.652h4.455V10.4h-4.455z" fill="currentColor" opacity=".6"/>
      <path d="m6.347 10.673 2.146-.123 1.349 4.142.093.39h.046l.107-.39 1.453-4.263 2.002-.123-2.64 6.797 2.665 6.797-2.044-.136-1.506-4.505-.08-.326h-.046l-.093.326-1.453 4.385-2.044-.136 2.585-6.676z" fill="currentColor"/>
    </SvgIcon>
  );
}

interface Props {
  activeTab: number;
  scope: ScopeSelection;
}

export function ExcelExportButton({ activeTab, scope }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      switch (activeTab) {
        case 0: {
          const { generateGroupPQR } = await import('@/lib/excel/group-pqr');
          await generateGroupPQR(scope);
          break;
        }
        case 1: {
          const { generateConsumerPQR } = await import('@/lib/excel/consumer-pqr');
          await generateConsumerPQR(scope);
          break;
        }
        case 2: {
          const { generateTradePQR } = await import('@/lib/excel/trade-pqr');
          await generateTradePQR(scope);
          break;
        }
        case 3: {
          const { generateCorporatePQR } = await import('@/lib/excel/corporate-pqr');
          await generateCorporatePQR(scope);
          break;
        }
        case 4: {
          const { generateRiskPQR } = await import('@/lib/excel/risk-pqr');
          await generateRiskPQR(scope);
          break;
        }
      }
    } catch (err) {
      console.error('Excel PQR generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tooltip title="Download PQR Excel">
      <span>
        <IconButton size="small" onClick={handleExport} disabled={generating} sx={{ color: 'text.secondary' }}>
          {generating ? <CircularProgress size={16} /> : <ExcelIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
