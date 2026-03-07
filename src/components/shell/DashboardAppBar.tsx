'use client';

import {
  AppBar, Toolbar, Typography, Box, IconButton, Chip, Tooltip, Avatar, Button,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '@/lib/theme-context';
import { ExecutiveSummaryButton } from '@/components/export/ExecutiveSummaryButton';
import type { DatasetInfo } from '@/lib/types';

interface Props {
  datasetInfo: DatasetInfo | null;
  onToggleAI: () => void;
  onReload: () => void;
  onExportPDF: () => void;
  aiOpen: boolean;
  activeTab?: number;
}

export function DashboardAppBar({ datasetInfo, onToggleAI, onReload, onExportPDF, aiOpen, activeTab }: Props) {
  const { mode, toggleMode } = useThemeMode();
  const fileCount = datasetInfo?.files.length ?? 0;
  const totalRecords = datasetInfo?.files.reduce((s, f) => s + f.recordCount, 0) ?? 0;

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ gap: 2 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #00897b 0%, #004d40 100%)',
          }}
        >
          <ShowChartIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.05rem', lineHeight: 1.2, color: 'text.primary' }}>
            Portfolio Monitor
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            Group Credit Risk Dashboard
          </Typography>
        </Box>

        {datasetInfo && fileCount > 0 && (
          <Chip
            size="small"
            label={`${fileCount} file${fileCount > 1 ? 's' : ''} · ${totalRecords} records`}
            sx={{ bgcolor: 'rgba(0,137,123,0.15)', color: 'primary.light', fontWeight: 600 }}
          />
        )}

        <Tooltip title="Reload data from files">
          <IconButton size="small" onClick={onReload} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {activeTab === 2 && <ExecutiveSummaryButton />}

        <Tooltip title="Export PDF">
          <IconButton size="small" onClick={onExportPDF} sx={{ color: 'text.secondary' }}>
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton size="small" onClick={toggleMode} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Button
          size="small"
          variant={aiOpen ? 'contained' : 'outlined'}
          startIcon={<SmartToyOutlinedIcon />}
          onClick={onToggleAI}
          sx={{
            borderColor: 'divider',
            fontSize: '0.75rem',
            ...(aiOpen && {
              background: 'linear-gradient(135deg, #00897b, #004d40)',
              color: '#fff',
            }),
          }}
        >
          AI Query
        </Button>

        <Avatar sx={{ width: 32, height: 32, bgcolor: mode === 'dark' ? '#1e293b' : '#e2e8f0', color: 'text.primary', fontSize: '0.75rem', fontWeight: 700 }}>
          U
        </Avatar>
      </Toolbar>
    </AppBar>
  );
}
