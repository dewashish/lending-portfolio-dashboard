'use client';

import {
  Chip, Autocomplete, TextField, IconButton, Tooltip, Paper, Stack,
} from '@mui/material';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import type { FilterState, PortfolioData } from '@/lib/types';
import { ENTITIES } from '@/lib/constants';

interface Props {
  filters: FilterState;
  onChange: (update: Partial<FilterState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  portfolio: PortfolioData | null;
}

export function FilterBar({ filters, onChange, onReset, hasActiveFilters, portfolio }: Props) {
  const entities = portfolio?.datasetInfo.entities ?? [...ENTITIES];
  const countries = portfolio?.datasetInfo.countries ?? [];
  const products = portfolio?.productMix?.map(p => p.productType) ?? [];

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2, py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflowX: 'auto',
        flexWrap: 'wrap',
        '&::-webkit-scrollbar': { height: 0 },
      }}
    >
      <Autocomplete
        multiple
        size="small"
        options={entities}
        value={filters.entities}
        onChange={(_, v) => onChange({ entities: v })}
        renderInput={(params) => (
          <TextField {...params} placeholder="Entity" variant="outlined" sx={{ minWidth: 160 }} />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, idx) => (
            <Chip {...getTagProps({ index: idx })} key={option} label={option} size="small" />
          ))
        }
        sx={{ minWidth: 180 }}
      />

      {countries.length > 0 && (
        <Autocomplete
          multiple
          size="small"
          options={countries}
          value={filters.countries}
          onChange={(_, v) => onChange({ countries: v })}
          renderInput={(params) => (
            <TextField {...params} placeholder="Country" variant="outlined" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, idx) => (
              <Chip {...getTagProps({ index: idx })} key={option} label={option} size="small" />
            ))
          }
          sx={{ minWidth: 160 }}
        />
      )}

      {products.length > 0 && (
        <Autocomplete
          multiple
          size="small"
          options={products}
          value={filters.products}
          onChange={(_, v) => onChange({ products: v })}
          renderInput={(params) => (
            <TextField {...params} placeholder="Product" variant="outlined" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, idx) => (
              <Chip {...getTagProps({ index: idx })} key={option} label={option} size="small" />
            ))
          }
          sx={{ minWidth: 160 }}
        />
      )}

      <Stack direction="row" spacing={0.5}>
        {(['Stage 1', 'Stage 2', 'Stage 3'] as const).map(stage => (
          <Chip
            key={stage}
            label={stage}
            size="small"
            variant={filters.ifrsStages.includes(stage) ? 'filled' : 'outlined'}
            onClick={() => {
              const current = filters.ifrsStages;
              onChange({
                ifrsStages: current.includes(stage)
                  ? current.filter(s => s !== stage)
                  : [...current, stage],
              });
            }}
            sx={{
              ...(filters.ifrsStages.includes(stage) && {
                bgcolor: stage === 'Stage 1' ? '#1b5e20' : stage === 'Stage 2' ? '#e65100' : '#b71c1c',
                color: '#fff',
              }),
            }}
          />
        ))}
      </Stack>

      {hasActiveFilters && (
        <Tooltip title="Clear all filters">
          <IconButton size="small" onClick={onReset} sx={{ color: 'warning.main' }}>
            <FilterListOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Paper>
  );
}
