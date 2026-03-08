'use client';

import { useState, useMemo } from 'react';
import {
  Drawer, Box, Typography, IconButton, Tabs, Tab,
  TextField, Button, Stack, Chip, Select, MenuItem,
  Tooltip, Divider, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import LockIcon from '@mui/icons-material/Lock';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useAdmin } from '@/lib/admin-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { getMetricsByBusinessLine } from '@/lib/risk-appetite/metric-registry';
import { resolveThreshold } from '@/lib/risk-appetite/resolve-thresholds';
import { upsertThreshold, deleteThreshold } from '@/lib/queries/risk-appetite';
import { useSubsidiaries, useRegions } from '@/hooks/useConsumerData';
import { RAG_COLORS } from '@/lib/constants';
import type { RiskAppetiteScopeLevel, MetricDefinition, RiskAppetiteRow } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onRequestPin: () => void;
}

const SCOPE_TABS: { value: RiskAppetiteScopeLevel; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'region', label: 'Region' },
  { value: 'subsidiary', label: 'Subsidiary' },
  { value: 'business_line', label: 'Business Line' },
  { value: 'product', label: 'Product' },
];

const BL_OPTIONS = [
  { value: 'consumer_finance', label: 'Consumer Finance' },
  { value: 'trade_finance', label: 'Trade Finance' },
  { value: 'corporate_finance', label: 'Corporate Finance' },
];

function scopeLabelFor(level: RiskAppetiteScopeLevel): string {
  return SCOPE_TABS.find((t) => t.value === level)?.label ?? level;
}

export function RiskAppetiteDrawer({ open, onClose, onRequestPin }: Props) {
  const { isAdmin, lock } = useAdmin();
  const { thresholds, mutate } = useRiskAppetite();
  const { data: subsidiaries } = useSubsidiaries();
  const { data: regions } = useRegions();

  const [scopeLevel, setScopeLevel] = useState<RiskAppetiteScopeLevel>('global');
  const [selectedRegionId, setSelectedRegionId] = useState<number | ''>('');
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<number | ''>('');
  const [selectedBL, setSelectedBL] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, { appetite: string; tolerance: string }>>({});
  const [saving, setSaving] = useState(false);

  const metricGroups = useMemo(() => getMetricsByBusinessLine(), []);

  // Build the context for the current scope selection
  const currentContext = useMemo(() => {
    const ctx: { subsidiaryId?: number; regionId?: number; businessLine?: string; product?: string } = {};
    if (scopeLevel === 'region' && selectedRegionId) ctx.regionId = selectedRegionId as number;
    if (['subsidiary', 'business_line', 'product'].includes(scopeLevel) && selectedSubsidiaryId) ctx.subsidiaryId = selectedSubsidiaryId as number;
    if (['business_line', 'product'].includes(scopeLevel) && selectedBL) ctx.businessLine = selectedBL;
    if (scopeLevel === 'product' && selectedProduct) ctx.product = selectedProduct;
    return ctx;
  }, [scopeLevel, selectedRegionId, selectedSubsidiaryId, selectedBL, selectedProduct]);

  // Find the exact row for current scope (not inherited)
  function findExactRow(metricKey: string): RiskAppetiteRow | undefined {
    return thresholds.find((r) => {
      if (r.metric_key !== metricKey || r.scope_level !== scopeLevel) return false;
      if (scopeLevel === 'global') return true;
      if (scopeLevel === 'region') return r.region_id === currentContext.regionId;
      if (scopeLevel === 'subsidiary') return r.subsidiary_id === currentContext.subsidiaryId;
      if (scopeLevel === 'business_line') return r.subsidiary_id === currentContext.subsidiaryId && r.business_line === currentContext.businessLine;
      if (scopeLevel === 'product') return r.subsidiary_id === currentContext.subsidiaryId && r.business_line === currentContext.businessLine && r.product_name === currentContext.product;
      return false;
    });
  }

  const handleEdit = (metricKey: string, field: 'appetite' | 'tolerance', val: string) => {
    setEdits((prev) => ({
      ...prev,
      [metricKey]: { ...prev[metricKey], [field]: val },
    }));
  };

  const handleSave = async (metric: MetricDefinition) => {
    const edit = edits[metric.key];
    if (!edit) return;

    const appetite = parseFloat(edit.appetite);
    const tolerance = parseFloat(edit.tolerance);
    if (isNaN(appetite) || isNaN(tolerance)) return;

    setSaving(true);
    try {
      await upsertThreshold({
        metric_key: metric.key,
        scope_level: scopeLevel,
        region_id: scopeLevel === 'region' ? (currentContext.regionId ?? null) : null,
        subsidiary_id: ['subsidiary', 'business_line', 'product'].includes(scopeLevel) ? (currentContext.subsidiaryId ?? null) : null,
        business_line: ['business_line', 'product'].includes(scopeLevel) ? (currentContext.businessLine ?? null) : null,
        product_name: scopeLevel === 'product' ? (currentContext.product ?? null) : null,
        appetite,
        tolerance,
      });
      await mutate();
      setEdits((prev) => {
        const next = { ...prev };
        delete next[metric.key];
        return next;
      });
    } catch (err) {
      console.error('Failed to save threshold:', err);
    }
    setSaving(false);
  };

  const handleReset = async (metric: MetricDefinition) => {
    const exactRow = findExactRow(metric.key);
    if (!exactRow) return;
    setSaving(true);
    try {
      await deleteThreshold(exactRow.id);
      await mutate();
    } catch (err) {
      console.error('Failed to reset threshold:', err);
    }
    setSaving(false);
  };

  const renderMetricRow = (metric: MetricDefinition) => {
    const resolved = resolveThreshold(metric.key, thresholds, currentContext);
    const exactRow = findExactRow(metric.key);
    const hasOverride = !!exactRow;
    const edit = edits[metric.key];
    const appetiteVal = edit?.appetite ?? String(resolved.appetite);
    const toleranceVal = edit?.tolerance ?? String(resolved.tolerance);
    const isDirty = !!edit;

    return (
      <Box key={metric.key} sx={{ py: 1, px: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Tooltip title={metric.direction === 'lower_is_better' ? 'Lower is better' : 'Higher is better'}>
            {metric.direction === 'lower_is_better'
              ? <ArrowDownwardIcon sx={{ fontSize: 14, color: RAG_COLORS.Green }} />
              : <ArrowUpwardIcon sx={{ fontSize: 14, color: RAG_COLORS.Green }} />
            }
          </Tooltip>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>{metric.label}</Typography>
          {!hasOverride && scopeLevel !== 'global' && (
            <Chip
              label={`Inherited from ${scopeLabelFor(resolved.scopeLevel)}`}
              size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'action.hover' }}
            />
          )}
          {hasOverride && scopeLevel !== 'global' && (
            <Chip
              label="Override"
              size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#e3f2fd', color: '#1565c0' }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Appetite"
            value={appetiteVal}
            onChange={(e) => handleEdit(metric.key, 'appetite', e.target.value)}
            disabled={!isAdmin}
            sx={{
              flex: 1,
              '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.75 },
              '& .MuiInputLabel-root': { fontSize: '0.7rem' },
            }}
            InputProps={{
              endAdornment: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS.Green, ml: 0.5 }} />,
            }}
          />
          <TextField
            size="small"
            label="Tolerance"
            value={toleranceVal}
            onChange={(e) => handleEdit(metric.key, 'tolerance', e.target.value)}
            disabled={!isAdmin}
            sx={{
              flex: 1,
              '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.75 },
              '& .MuiInputLabel-root': { fontSize: '0.7rem' },
            }}
            InputProps={{
              endAdornment: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RAG_COLORS.Red, ml: 0.5 }} />,
            }}
          />
          {isAdmin && isDirty && (
            <Tooltip title="Save">
              <IconButton size="small" onClick={() => handleSave(metric)} disabled={saving}>
                <SaveIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {isAdmin && hasOverride && scopeLevel !== 'global' && (
            <Tooltip title="Reset to inherited value">
              <IconButton size="small" onClick={() => handleReset(metric)} disabled={saving}>
                <RestoreIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    );
  };

  const needsSelector =
    (scopeLevel === 'region' && !selectedRegionId) ||
    (['subsidiary', 'business_line', 'product'].includes(scopeLevel) && !selectedSubsidiaryId) ||
    (['business_line', 'product'].includes(scopeLevel) && !selectedBL) ||
    (scopeLevel === 'product' && !selectedProduct);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, bgcolor: 'background.default' } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, flex: 1 }}>
            Risk Appetite Settings
          </Typography>
          {isAdmin ? (
            <Tooltip title="Lock admin">
              <IconButton size="small" onClick={lock}>
                <LockIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button size="small" variant="outlined" onClick={onRequestPin} sx={{ fontSize: '0.68rem', mr: 1 }}>
              Unlock Admin
            </Button>
          )}
          <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </Box>

        {/* Scope Tabs */}
        <Tabs
          value={scopeLevel}
          onChange={(_, v) => { setScopeLevel(v); setEdits({}); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 32,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.68rem', textTransform: 'none', fontWeight: 600 },
          }}
        >
          {SCOPE_TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
        </Tabs>

        {/* Scope Selectors */}
        {scopeLevel !== 'global' && (
          <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
            {scopeLevel === 'region' && (
              <Select
                size="small"
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value as number)}
                displayEmpty
                sx={{ minWidth: 150, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
              >
                <MenuItem value="" sx={{ fontSize: '0.72rem' }}><em>Select region...</em></MenuItem>
                {(regions ?? []).map((r) => (
                  <MenuItem key={r.id} value={r.id} sx={{ fontSize: '0.72rem' }}>{r.name}</MenuItem>
                ))}
              </Select>
            )}
            {['subsidiary', 'business_line', 'product'].includes(scopeLevel) && (
              <Select
                size="small"
                value={selectedSubsidiaryId}
                onChange={(e) => setSelectedSubsidiaryId(e.target.value as number)}
                displayEmpty
                sx={{ minWidth: 160, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
              >
                <MenuItem value="" sx={{ fontSize: '0.72rem' }}><em>Select subsidiary...</em></MenuItem>
                {(subsidiaries ?? []).map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.72rem' }}>{s.shortCode} · {s.name}</MenuItem>
                ))}
              </Select>
            )}
            {['business_line', 'product'].includes(scopeLevel) && (
              <Select
                size="small"
                value={selectedBL}
                onChange={(e) => setSelectedBL(e.target.value)}
                displayEmpty
                sx={{ minWidth: 150, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
              >
                <MenuItem value="" sx={{ fontSize: '0.72rem' }}><em>Business line...</em></MenuItem>
                {BL_OPTIONS.map((bl) => (
                  <MenuItem key={bl.value} value={bl.value} sx={{ fontSize: '0.72rem' }}>{bl.label}</MenuItem>
                ))}
              </Select>
            )}
            {scopeLevel === 'product' && (
              <TextField
                size="small"
                placeholder="Product name..."
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                sx={{ minWidth: 140, '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.5 } }}
              />
            )}
          </Box>
        )}

        {/* Metric Groups */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1 }}>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.7rem', py: 0, '& .MuiAlert-icon': { fontSize: 16 } }}>
              View-only mode. Click &quot;Unlock Admin&quot; to edit thresholds.
            </Alert>
          )}

          {needsSelector ? (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 2, textAlign: 'center' }}>
              Select scope parameters above to view thresholds.
            </Typography>
          ) : (
            Object.entries(metricGroups).map(([bl, metrics]) => {
              const blLabel = BL_OPTIONS.find((b) => b.value === bl)?.label ?? bl;
              return (
                <Box key={bl} sx={{ mb: 2 }}>
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    {blLabel}
                  </Typography>
                  <Divider sx={{ mb: 0.5 }} />
                  {metrics.map(renderMetricRow)}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
