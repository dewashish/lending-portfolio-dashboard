'use client';

import { Box, Select, MenuItem, Autocomplete, TextField, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';
import { DEFAULT_CONSUMER_FILTERS } from '@/lib/constants';
import { useConsumerPeriods, useConsumerProducts } from '@/hooks/useConsumerData';

interface Props {
  filters: ConsumerFilters;
  onChange: (f: ConsumerFilters) => void;
  scope?: ScopeSelection;
}

export function ConsumerFilterBar({ filters, onChange, scope }: Props) {
  const { data: periods } = useConsumerPeriods(scope);
  const { data: products } = useConsumerProducts(scope);

  const hasFilters = filters.period !== null || filters.products.length > 0;

  return (
    <Box
      sx={{
        px: 2.5,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        Filters
      </Typography>

      <Select
        size="small"
        displayEmpty
        value={filters.period ?? ''}
        onChange={(e) => onChange({ ...filters, period: e.target.value === '' ? null : (e.target.value as string) })}
        sx={{ minWidth: 130, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
      >
        <MenuItem value="" sx={{ fontSize: '0.72rem' }}>All Periods</MenuItem>
        {(periods ?? []).map((p) => (
          <MenuItem key={p} value={p} sx={{ fontSize: '0.72rem' }}>{p}</MenuItem>
        ))}
      </Select>

      <Autocomplete
        multiple
        size="small"
        options={products ?? []}
        value={filters.products}
        onChange={(_, val) => onChange({ ...filters, products: val })}
        renderInput={(params) => (
          <TextField {...params} placeholder={filters.products.length === 0 ? 'All Products' : ''} sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem', py: 0 } }} />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option} label={option} size="small" sx={{ fontSize: '0.62rem', height: 20 }} />
          ))
        }
        sx={{ minWidth: 220, maxWidth: 400 }}
      />

      {hasFilters && (
        <Tooltip title="Clear filters">
          <IconButton size="small" onClick={() => onChange(DEFAULT_CONSUMER_FILTERS)} sx={{ color: 'text.secondary' }}>
            <FilterListOffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
