'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatNumber, formatPercent } from '@/lib/format';
import type { LOSFunnelStep } from '@/lib/types';

interface Props {
  data: LOSFunnelStep[];
}

const BAR_COLORS = {
  mtd: '#00897b',
  lmtd: '#94a3b8',
  ftd: '#ff9800',
} as const;

export function LOSFunnelChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { stages, product } = useMemo(() => {
    if (!data.length) return { stages: [], product: '' };
    // Pick the first product (or 'All Products' if available)
    const products = Array.from(new Set(data.map((d) => d.product)));
    const selectedProduct =
      products.find((p) => p.toLowerCase().includes('all')) ?? products[0] ?? '';
    const filtered = data.filter((d) => d.product === selectedProduct);

    // Order stages by natural funnel order
    const stageOrder = ['Leads', 'Applications', 'Sanctioned', 'Disbursed'];
    const ordered = stageOrder
      .map((s) => filtered.find((d) => d.stage === s))
      .filter(Boolean) as LOSFunnelStep[];

    // If not matching exact names, fall back to whatever stages exist
    const result = ordered.length > 0 ? ordered : filtered;
    return { stages: result, product: selectedProduct };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 30, bottom: 20, left: 120 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const stageNames = stages.map((s) => s.stage);
      // Allocate vertical space: each stage gets 3 bars + gap for conversion label
      const stageSpacing = h / stageNames.length;
      const barHeight = Math.min(16, (stageSpacing - 30) / 3);
      const barGap = 2;

      // Max value across all metrics for scaling
      const maxVal = d3.max(stages, (s) => Math.max(s.mtd, s.lmtd, s.ftd)) ?? 1;
      const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, w]);

      stages.forEach((stage, i) => {
        const stageY = i * stageSpacing;

        // Stage label on left
        g.append('text')
          .attr('x', -8)
          .attr('y', stageY + (barHeight * 3 + barGap * 2) / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'end')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '11px')
          .attr('font-weight', 600)
          .text(stage.stage);

        // Draw 3 bars: MTD, LMTD, FTD
        const barData = [
          { key: 'MTD', value: stage.mtd, color: BAR_COLORS.mtd },
          { key: 'LMTD', value: stage.lmtd, color: BAR_COLORS.lmtd },
          { key: 'FTD', value: stage.ftd, color: BAR_COLORS.ftd },
        ];

        barData.forEach((bar, bi) => {
          const by = stageY + bi * (barHeight + barGap);

          g.append('rect')
            .attr('x', 0)
            .attr('y', by)
            .attr('width', x(bar.value))
            .attr('height', barHeight)
            .attr('fill', bar.color)
            .attr('rx', 3)
            .attr('opacity', 0.9);

          // Bar value label
          g.append('text')
            .attr('x', x(bar.value) + 4)
            .attr('y', by + barHeight / 2)
            .attr('dy', '0.35em')
            .attr('fill', d3Tokens.textMuted)
            .attr('font-size', '10px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(formatNumber(bar.value));

          // Bar key label (small)
          if (i === 0) {
            // only label bars once (in the first stage row) — or always if preferred
          }
        });

        // Conversion rate label between this stage and the next
        if (i < stages.length - 1) {
          const convRate = stage.conversionRate;
          const labelY = stageY + barHeight * 3 + barGap * 2 + 8;
          g.append('text')
            .attr('x', w / 2)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .attr('fill', d3Tokens.textMuted)
            .attr('font-size', '10px')
            .attr('font-style', 'italic')
            .text(`${formatPercent(convRate, 1)} conversion`);

          // Small arrow indicator
          g.append('text')
            .attr('x', w / 2)
            .attr('y', labelY + 10)
            .attr('text-anchor', 'middle')
            .attr('fill', d3Tokens.textFaint)
            .attr('font-size', '9px')
            .text('\u25BC');
        }
      });

      // Legend
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - 12})`);
      let lx = 0;
      [
        { key: 'MTD', color: BAR_COLORS.mtd },
        { key: 'LMTD', color: BAR_COLORS.lmtd },
        { key: 'FTD', color: BAR_COLORS.ftd },
      ].forEach(({ key, color }) => {
        legendG
          .append('rect')
          .attr('x', lx)
          .attr('y', 0)
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', color)
          .attr('rx', 2);
        const label = legendG
          .append('text')
          .attr('x', lx + 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(key);
        lx += (label.node()?.getComputedTextLength() ?? 24) + 24;
      });
    },
    [stages, d3Tokens],
  );

  return (
    <ChartContainer
      title="LOS Origination Funnel"
      subtitle={product ? `Product: ${product}` : undefined}
      empty={!stages.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
