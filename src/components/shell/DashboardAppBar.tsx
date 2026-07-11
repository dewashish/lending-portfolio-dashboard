'use client';

import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Tooltip, Avatar, Button,
  ToggleButtonGroup, ToggleButton, Select, MenuItem,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { AvaMark } from '@/components/ava/AvaMark';
import { AVA_GRADIENT } from '@/lib/ava/brand';
import { ExcelExportButton } from '@/components/export/ExcelExportButton';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import BusinessIcon from '@mui/icons-material/Business';
import { useThemeMode } from '@/lib/theme-context';
import { useCurrency } from '@/lib/currency-context';
import { ExecutiveSummaryButton } from '@/components/export/ExecutiveSummaryButton';
import { useAllBreachAlerts } from '@/hooks/useBreachAlerts';
import { BreachTickerBar } from '@/components/shell/BreachTickerBar';
import { BreachAlertsPopover } from '@/components/shell/BreachAlertsPopover';
import type { ScopeSelection, ScopeLevel } from '@/lib/types';
import { useSubsidiaries, useRegions } from '@/hooks/useConsumerData';
import { useUser } from '@/lib/user-context';
import { ProfileMenu } from '@/components/shell/ProfileMenu';

interface Props {
  onToggleAI: () => void;
  onToggleSettings: () => void;
  aiOpen: boolean;
  activeTab?: number;
  scope: ScopeSelection;
  onScopeChange: (scope: ScopeSelection) => void;
  onTabChange?: (tabIndex: number) => void;
}

export function DashboardAppBar({ onToggleAI, onToggleSettings, aiOpen, activeTab, scope, onScopeChange, onTabChange }: Props) {
  const { mode, toggleMode } = useThemeMode();
  const { currency, toggleCurrency } = useCurrency();
  const { data: subsidiaries } = useSubsidiaries();
  const { data: regions } = useRegions();
  const { alerts } = useAllBreachAlerts(scope);
  const { profile } = useUser();
  const [alertsAnchorEl, setAlertsAnchorEl] = useState<HTMLElement | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);

  const handleOpenSql = () => {
    window.open('https://supabase.com/dashboard/project/wnkrllrureljmezcoryf/sql/new', '_blank');
  };

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleLevelChange = (_: unknown, newLevel: ScopeLevel | null) => {
    if (!newLevel) return;
    if (newLevel === 'group') {
      onScopeChange({ level: 'group' });
    } else if (newLevel === 'region') {
      onScopeChange({ level: 'region', regionId: regions?.[0]?.id });
    } else if (newLevel === 'subsidiary') {
      onScopeChange({ level: 'subsidiary', subsidiaryId: subsidiaries?.[0]?.id });
    }
  };

  return (
    <AppBar position="static" elevation={0} sx={{
      bgcolor: mode === 'dark' ? 'rgba(10,15,26,0.75)' : 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(16px)',
      zIndex: 2,
    }}>
      <Toolbar sx={{ gap: 1.5 }}>
        {/* Company branding */}
        <Box
          sx={{
            width: 28, height: 28, borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #00897b 0%, #004d40 100%)',
            '@keyframes spin': { '0%': { transform: 'rotateY(0deg)' }, '100%': { transform: 'rotateY(360deg)' } },
            animation: 'spin 4s ease-in-out infinite',
          }}
        >
          <AccountBalanceIcon sx={{ fontSize: 16, color: '#fff' }} />
        </Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary', letterSpacing: '0.02em' }}>
          Avalora Portfolio Monitor
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Scope toggle */}
        <ToggleButtonGroup
          id="tour-scope-selector"
          value={scope.level}
          exclusive
          onChange={handleLevelChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 600, textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="group">
            <Tooltip title="Group (All)"><PublicIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="region">
            <Tooltip title="By Region"><MapIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="subsidiary">
            <Tooltip title="By Subsidiary"><BusinessIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Scope selector dropdown */}
        {scope.level === 'region' && regions && regions.length > 0 && (
          <Select
            size="small"
            value={scope.regionId ?? ''}
            onChange={(e) => onScopeChange({ level: 'region', regionId: e.target.value as number })}
            sx={{ minWidth: 130, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
          >
            {regions.map((r) => (
              <MenuItem key={r.id} value={r.id} sx={{ fontSize: '0.72rem' }}>{r.name}</MenuItem>
            ))}
          </Select>
        )}
        {scope.level === 'subsidiary' && subsidiaries && subsidiaries.length > 0 && (
          <Select
            size="small"
            value={scope.subsidiaryId ?? ''}
            onChange={(e) => onScopeChange({ level: 'subsidiary', subsidiaryId: e.target.value as number })}
            sx={{ minWidth: 160, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
          >
            {subsidiaries.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.72rem' }}>
                {s.shortCode} · {s.currencyCode}
              </MenuItem>
            ))}
          </Select>
        )}

        <Box id="tour-breach-ticker" sx={{ display: 'flex', alignItems: 'center' }}>
          {alerts.length > 0 && (
            <BreachTickerBar alerts={alerts} onClick={(e) => setAlertsAnchorEl(e.currentTarget)} />
          )}
        </Box>
        <BreachAlertsPopover
          anchorEl={alertsAnchorEl}
          open={Boolean(alertsAnchorEl)}
          onClose={() => setAlertsAnchorEl(null)}
          alerts={alerts}
          onTabChange={onTabChange}
        />

        <Box id="tour-export-area" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ExecutiveSummaryButton activeTab={activeTab ?? 0} scope={scope} />
          <ExcelExportButton activeTab={activeTab ?? 0} scope={scope} />
          <Tooltip title="Open SQL Query Editor">
            <IconButton id="tour-sql-query" size="small" onClick={handleOpenSql} sx={{ color: 'text.secondary' }}>
              <StorageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Tooltip title="Switch currency display">
          <ToggleButtonGroup
            id="tour-currency-toggle"
            value={currency}
            exclusive
            onChange={(_, v) => { if (v) toggleCurrency(); }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: 0.75, py: 0.2, fontSize: '0.65rem', fontWeight: 700, textTransform: 'none',
                minWidth: 36,
              },
            }}
          >
            <ToggleButton value="USD">$</ToggleButton>
            <ToggleButton value="AED">AED</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>

        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton id="tour-theme-toggle" size="small" onClick={toggleMode} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Risk Appetite Settings">
          <IconButton id="tour-settings-button" size="small" onClick={onToggleSettings} sx={{ color: 'text.secondary' }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Button
          id="tour-ai-button"
          size="small"
          variant={aiOpen ? 'contained' : 'outlined'}
          startIcon={aiOpen ? <AvaMark size={15} color="#fff" /> : <AvaMark size={15} />}
          onClick={onToggleAI}
          sx={{
            borderColor: 'divider',
            fontSize: '0.75rem',
            fontWeight: 700,
            ...(aiOpen && {
              background: AVA_GRADIENT,
              color: '#fff',
            }),
          }}
        >
          Ask AVA
        </Button>

        <Avatar
          id="tour-profile-avatar"
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            width: 32, height: 32, cursor: 'pointer',
            bgcolor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
            color: 'text.primary', fontSize: '0.75rem', fontWeight: 700,
            '&:hover': { opacity: 0.8 },
          }}
        >
          {initials}
        </Avatar>
        <ProfileMenu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
        />
      </Toolbar>
    </AppBar>
  );
}
