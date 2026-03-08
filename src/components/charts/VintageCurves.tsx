'use client';

import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { Box, Chip } from '@mui/material';
import { formatPercent } from '@/lib/format';
import type { VintagePoint } from '@/lib/types';

interface Props {
  data: VintagePoint[];
  metricType: string;
}

export function VintageCurves({ data, metricType }: Props) {
  const { d3Tokens } = useThemeMode();

  const filtered = useMemo(
    () => data.filter((d) => d.metricType === metricType),
    [data, metricType],
  );

  const vintages = useMemo(
    () => Array.from(new Set(filtered.map((d) => d.vintage))),
    [filtered],
  );

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (v: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const visible = useMemo(
    () => filtered.filter((d) => !hidden.has(d.vintage)),
    [filtered, hidden],
  );

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(vintages);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 36, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(visible, (d) => d.mob) ?? 12])
        .range([0, w]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(visible, (d) => d.delinquencyRate) ?? 0.1])
        .nice()
        .range([h, 0]);

      // Grid
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickFormat((d) => formatPercent(+d, 1))
            .tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat((d) => `${d}`))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px');

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Months on Book (MOB)');

      // Lines
      const grouped = d3.group(visible, (d) => d.vintage);

      const line = d3
        .line<VintagePoint>()
        .x((d) => x(d.mob))
        .y((d) => y(d.delinquencyRate))
        .curve(d3.curveMonotoneX);

      grouped.forEach((points, vintage) => {
        const sorted = points.sort((a, b) => a.mob - b.mob);
        g.append('path')
          .datum(sorted)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color(vintage))
          .attr('stroke-width', 2)
          .attr('opacity', 0.85);

        // Dots
        g.selectAll(`.dot-${vintage.replace(/[^a-zA-Z0-9]/g, '')}`)
          .data(sorted)
          .join('circle')
          .attr('cx', (d) => x(d.mob))
          .attr('cy', (d) => y(d.delinquencyRate))
          .attr('r', 3)
          .attr('fill', color(vintage));
      });
    },
    [visible, metricType, d3Tokens],
  );

  return (
    <ChartContainer title={`Static Pool \u2014 ${metricType}`} empty={!filtered.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {vintages.map((v) => (
          <Chip
            key={v}
            label={v}
            size="small"
            onClick={() => toggle(v)}
            sx={{
              fontSize: '10px',
              height: 22,
              bgcolor: hidden.has(v) ? 'action.hover' : color(v),
              color: hidden.has(v) ? 'text.disabled' : '#fff',
              opacity: hidden.has(v) ? 0.5 : 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
          />
        ))}
      </Box>
    </ChartContainer>
  );
}
