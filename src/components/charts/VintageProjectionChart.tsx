'use client';

import { useState, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { VintageForecastRow } from '@/lib/types';

interface Props {
  data: VintageForecastRow[];
}

interface PlotPoint {
  mob: number;
  rate: number;
  isProjected: boolean;
}

export function VintageProjectionChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const vintages = useMemo(
    () => Array.from(new Set(data.map((d) => d.vintage))),
    [data],
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
    () => data.filter((d) => !hidden.has(d.vintage)),
    [data, hidden],
  );

  const color = useMemo(
    () => d3.scaleOrdinal(d3.schemeTableau10).domain(vintages),
    [vintages],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { actual: PlotPoint[]; projected: PlotPoint[] }>();
    visible.forEach((row) => {
      const entry = map.get(row.vintage) ?? { actual: [], projected: [] };
      if (row.isProjected) {
        entry.projected.push({
          mob: row.mob,
          rate: row.projectedDelinqRate ?? 0,
          isProjected: true,
        });
      } else {
        entry.actual.push({
          mob: row.mob,
          rate: row.actualDelinqRate ?? 0,
          isProjected: false,
        });
      }
      map.set(row.vintage, entry);
    });
    return map;
  }, [visible]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 36, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const allMobs = visible.map((d) => d.mob);
      const allRates = visible.map((d) =>
        d.isProjected ? (d.projectedDelinqRate ?? 0) : (d.actualDelinqRate ?? 0),
      );

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(allMobs) ?? 24])
        .range([0, w]);

      const y = d3
        .scaleLinear()
        .domain([0, (d3.max(allRates) ?? 0.1) * 1.1])
        .nice()
        .range([h, 0]);

      // Grid
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(6)
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

      const lineGen = d3
        .line<PlotPoint>()
        .x((d) => x(d.mob))
        .y((d) => y(d.rate))
        .curve(d3.curveMonotoneX);

      grouped.forEach((segments, vintage) => {
        const clr = color(vintage);
        const actualSorted = segments.actual.sort((a, b) => a.mob - b.mob);
        const projectedSorted = segments.projected.sort((a, b) => a.mob - b.mob);

        // Actual portion - solid line
        if (actualSorted.length > 0) {
          g.append('path')
            .datum(actualSorted)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', clr)
            .attr('stroke-width', 2)
            .attr('opacity', 0.85);

          // Filled dots for actual
          g.selectAll(`.dot-actual-${vintage.replace(/[^a-zA-Z0-9]/g, '')}`)
            .data(actualSorted)
            .join('circle')
            .attr('cx', (d) => x(d.mob))
            .attr('cy', (d) => y(d.rate))
            .attr('r', 3)
            .attr('fill', clr);
        }

        // Connect actual to projected with a bridging segment
        if (actualSorted.length > 0 && projectedSorted.length > 0) {
          const bridgePoints = [actualSorted[actualSorted.length - 1], projectedSorted[0]];
          g.append('path')
            .datum(bridgePoints)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', clr)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '6,4')
            .attr('opacity', 0.85);
        }

        // Projected portion - dashed line
        if (projectedSorted.length > 0) {
          g.append('path')
            .datum(projectedSorted)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', clr)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '6,4')
            .attr('opacity', 0.85);

          // Hollow dots for projected
          g.selectAll(`.dot-proj-${vintage.replace(/[^a-zA-Z0-9]/g, '')}`)
            .data(projectedSorted)
            .join('circle')
            .attr('cx', (d) => x(d.mob))
            .attr('cy', (d) => y(d.rate))
            .attr('r', 3)
            .attr('fill', d3Tokens.bg)
            .attr('stroke', clr)
            .attr('stroke-width', 1.5);
        }
      });
    },
    [visible, grouped, color, d3Tokens],
  );

  return (
    <ChartContainer
      title="Vintage Delinquency Forecast"
      subtitle="Solid = actual, dashed = projected"
      empty={!data.length}
    >
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
