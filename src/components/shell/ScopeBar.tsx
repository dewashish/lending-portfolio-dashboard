'use client';

import { Box, ToggleButtonGroup, ToggleButton, Select, MenuItem, Typography, Chip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import BusinessIcon from '@mui/icons-material/Business';
import type { ScopeSelection, ScopeLevel } from '@/lib/types';
import { useSubsidiaries, useRegions } from '@/hooks/useConsumerData';

interface Props {
  scope: ScopeSelection;
  onChange: (scope: ScopeSelection) => void;
}

export function ScopeBar({ scope, onChange }: Props) {
  const { data: subsidiaries } = useSubsidiaries();
  const { data: regions } = useRegions();

  const handleLevelChange = (_: unknown, newLevel: ScopeLevel | null) => {
    if (!newLevel) return;
    if (newLevel === 'group') {
      onChange({ level: 'group' });
    } else if (newLevel === 'region') {
      onChange({ level: 'region', regionId: regions?.[0]?.id });
    } else if (newLevel === 'subsidiary') {
      onChange({ level: 'subsidiary', subsidiaryId: subsidiaries?.[0]?.id });
    }
  };

  const selectedSub = subsidiaries?.find((s) => s.id === scope.subsidiaryId);
  const selectedRegion = regions?.find((r) => r.id === scope.regionId);

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary', mr: 0.5 }}>
        Scope
      </Typography>

      <ToggleButtonGroup
        value={scope.level}
        exclusive
        onChange={handleLevelChange}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 1.5,
            py: 0.25,
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'none',
          },
        }}
      >
        <ToggleButton value="group">
          <PublicIcon sx={{ fontSize: 14, mr: 0.5 }} />
          Group
        </ToggleButton>
        <ToggleButton value="region">
          <MapIcon sx={{ fontSize: 14, mr: 0.5 }} />
          Region
        </ToggleButton>
        <ToggleButton value="subsidiary">
          <BusinessIcon sx={{ fontSize: 14, mr: 0.5 }} />
          Subsidiary
        </ToggleButton>
      </ToggleButtonGroup>

      {scope.level === 'region' && regions && regions.length > 0 && (
        <Select
          size="small"
          value={scope.regionId ?? ''}
          onChange={(e) => onChange({ level: 'region', regionId: e.target.value as number })}
          sx={{ minWidth: 150, fontSize: '0.75rem' }}
        >
          {regions.map((r) => (
            <MenuItem key={r.id} value={r.id} sx={{ fontSize: '0.75rem' }}>
              {r.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {scope.level === 'subsidiary' && subsidiaries && subsidiaries.length > 0 && (
        <Select
          size="small"
          value={scope.subsidiaryId ?? ''}
          onChange={(e) => onChange({ level: 'subsidiary', subsidiaryId: e.target.value as number })}
          sx={{ minWidth: 200, fontSize: '0.75rem' }}
        >
          {subsidiaries.map((s) => (
            <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.75rem' }}>
              {s.name} ({s.country})
            </MenuItem>
          ))}
        </Select>
      )}

      {/* Context chip */}
      {scope.level === 'group' && (
        <Chip label="All Subsidiaries (USD)" size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />
      )}
      {scope.level === 'region' && selectedRegion && (
        <Chip label={selectedRegion.name} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.68rem' }} />
      )}
      {scope.level === 'subsidiary' && selectedSub && (
        <Chip
          label={`${selectedSub.name} · ${selectedSub.currencyCode}`}
          size="small"
          color="primary"
          sx={{ fontSize: '0.68rem' }}
        />
      )}
    </Box>
  );
}
