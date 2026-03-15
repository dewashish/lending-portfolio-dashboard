'use client';

import { useState, useMemo } from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Select, MenuItem } from '@mui/material';
import { ConsumerProductTable } from '@/components/tables/ConsumerProductTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useProductMetrics, useProductCatalog } from '@/hooks/useConsumerData';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

type SecuredFilter = 'all' | 'secured' | 'unsecured';

export function ConsumerProductSection({ scope, filters }: Props) {
  const { data: productCatalog } = useProductCatalog(scope);
  const [securedFilter, setSecuredFilter] = useState<SecuredFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const availableProducts = useMemo(() => {
    if (!productCatalog) return [];
    if (securedFilter === 'all') return productCatalog;
    return productCatalog.filter((p) => p.productCategory.toLowerCase() === securedFilter);
  }, [productCatalog, securedFilter]);

  const effectiveProducts = useMemo(() => {
    if (selectedProduct) return [selectedProduct];
    return availableProducts.map((p) => p.productName);
  }, [selectedProduct, availableProducts]);

  const mergedFilters = useMemo<ConsumerFilters>(() => ({
    period: filters?.period ?? null,
    products: effectiveProducts,
  }), [filters, effectiveProducts]);

  const { data: products, isLoading } = useProductMetrics(scope, mergedFilters);

  const handleSecuredChange = (_: unknown, val: SecuredFilter | null) => {
    if (!val) return;
    setSecuredFilter(val);
    setSelectedProduct(null);
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={securedFilter}
          onChange={handleSecuredChange}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none', fontSize: '0.7rem', px: 1.5, py: 0.25,
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="secured">Secured</ToggleButton>
          <ToggleButton value="unsecured">Unsecured</ToggleButton>
        </ToggleButtonGroup>

        {availableProducts.length > 1 && (
          <Select
            size="small"
            displayEmpty
            value={selectedProduct ?? ''}
            onChange={(e) => setSelectedProduct(e.target.value || null)}
            sx={{ minWidth: 160, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
          >
            <MenuItem value="" sx={{ fontSize: '0.72rem' }}>All Products</MenuItem>
            {availableProducts.map((p) => (
              <MenuItem key={p.productName} value={p.productName} sx={{ fontSize: '0.72rem' }}>
                {p.productName}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>

      <ConsumerProductTable data={products ?? []} />
    </Box>
  );
}
