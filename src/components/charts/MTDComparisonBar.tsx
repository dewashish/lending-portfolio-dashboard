'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatNumber, formatPercent } from '@/lib/format';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import type { LOSComparisonMetric } from '@/lib/types';

interface Props {
  data: LOSComparisonMetric[];
}

const TEAL = '#00897b';
const GRAY = '#94a3b8';

export function MTDComparisonBar({ data }: Props) {
  const { getColor } = useRiskAppetite();
  const { d3Tokens } = useThemeMode();

  const filtered = useMemo(() => {
    // Show only 'All Products' rows (case-insensitive match)
    const allProducts = data.filter((d) =>
      d.product.toLowerCase().includes('all'),
    );
    return allProducts.length > 0 ? allProducts : data;
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 80, bottom: 20, left: 160 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const metricNames = filtered.map((d) => d.metric);

      // Each metric gets 2 bars (MTD + LMTD)
      const groupHeight = h / metricNames.length;
      const barHeight = Math.min(14, (groupHeight - 10) / 2);
      const barGap = 3;

      const maxVal = d3.max(filtered, (d) => Math.max(d.mtd, d.lmtd)) ?? 1;
      const x = d3.scaleLinear().domain([0, maxVal * 1.15]).range([0, w]);

      filtered.forEach((metric, i) => {
        const groupY = i * groupHeight;

        // Metric label on left
        g.append('text')
          .attr('x', -8)
          .attr('y', groupY + (barHeight * 2 + barGap) / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'end')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '10px')
          .attr('font-weight', 500)
          .text(
            metric.metric.length > 22
              ? metric.metric.slice(0, 22) + '...'
              : metric.metric,
          );

        // MTD bar
        const mtdY = groupY;
        g.append('rect')
          .attr('x', 0)
          .attr('y', mtdY)
          .attr('width', x(metric.mtd))
          .attr('height', barHeight)
          .attr('fill', TEAL)
          .attr('rx', 3)
          .attr('opacity', 0.9);

        // MTD value label
        g.append('text')
          .attr('x', x(metric.mtd) + 4)
          .attr('y', mtdY + barHeight / 2)
          .attr('dy', '0.35em')
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(metric.mtd));

        // MoM delta annotation next to MTD bar
        const delta = metric.momChange;
        if (delta != null && !isNaN(delta)) {
          const deltaSign = delta >= 0 ? '+' : '';
          const deltaColor = delta >= 0 ? '#4caf50' : '#f44336';
          g.append('text')
            .attr('x', x(metric.mtd) + 4 + (formatNumber(metric.mtd).length * 6 + 8))
            .attr('y', mtdY + barHeight / 2)
            .attr('dy', '0.35em')
            .attr('fill', deltaColor)
            .attr('font-size', '9px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(`(${deltaSign}${formatPercent(delta, 1)})`);
        }

        // LMTD bar
        const lmtdY = groupY + barHeight + barGap;
        g.append('rect')
          .attr('x', 0)
          .attr('y', lmtdY)
          .attr('width', x(metric.lmtd))
          .attr('height', barHeight)
          .attr('fill', GRAY)
          .attr('rx', 3)
          .attr('opacity', 0.7);

        // LMTD value label
        g.append('text')
          .attr('x', x(metric.lmtd) + 4)
          .attr('y', lmtdY + barHeight / 2)
          .attr('dy', '0.35em')
          .attr('fill', d3Tokens.textFaint)
          .attr('font-size', '10px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(metric.lmtd));

        // Traffic light circle at right edge
        const achievement = metric.achievement;
        const trafficColor = achievement != null ? getColor('los_achievement', achievement) : '#f44336';

        g.append('circle')
          .attr('cx', w + 20)
          .attr('cy', groupY + (barHeight * 2 + barGap) / 2)
          .attr('r', 6)
          .attr('fill', trafficColor)
          .attr('opacity', 0.9);
      });

      // Legend
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - 12})`);
      let lx = 0;
      [
        { key: 'MTD', color: TEAL },
        { key: 'LMTD', color: GRAY },
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
        lx += (label.node()?.getComputedTextLength() ?? 30) + 24;
      });

      // Traffic light legend
      legendG
        .append('circle')
        .attr('cx', lx + 6)
        .attr('cy', 5)
        .attr('r', 5)
        .attr('fill', '#4caf50');
      legendG
        .append('text')
        .attr('x', lx + 16)
        .attr('y', 9)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .text('Achievement status');
    },
    [filtered, d3Tokens, getColor],
  );

  // Dynamic height: each metric needs ~40px for two bars + spacing, plus margins
  const chartHeight = Math.max(320, filtered.length * 40 + 50);

  return (
    <ChartContainer
      title="MTD vs LMTD Comparison"
      subtitle={"All Products \u2014 with achievement traffic light"}
      height={chartHeight}
      empty={!filtered.length}
    >
      <svg ref={ref} width="100%" height={chartHeight} style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
