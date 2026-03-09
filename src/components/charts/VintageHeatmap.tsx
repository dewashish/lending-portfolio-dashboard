'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { VintagePoint } from '@/lib/types';

interface Props {
  data: VintagePoint[];
  metricType: string;
  fillHeight?: boolean;
}

const ROW_H = 44;
const MIN_CELL_W = 64;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 80 };

export function VintageHeatmap({ data, metricType, fillHeight }: Props) {
  const { d3Tokens } = useThemeMode();

  const filtered = useMemo(
    () => data.filter((d) => d.metricType === metricType),
    [data, metricType],
  );

  const { vintages, mobs, maxRate, cellMap } = useMemo(() => {
    // Sort vintages chronologically (parse short-form dates)
    const vintageSet = Array.from(new Set(filtered.map((d) => d.vintage)));
    const sorted = vintageSet.sort((a, b) => {
      const parseV = (s: string) => {
        const months: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const match = s.match(/([A-Za-z]+)'?(\d{2,4})/);
        if (!match) return 0;
        const m = months[match[1]] ?? 0;
        let y = parseInt(match[2], 10);
        if (y < 100) y += 2000;
        return y * 12 + m;
      };
      return parseV(a) - parseV(b);
    });

    const mobSet = Array.from(new Set(filtered.map((d) => d.mob))).sort((a, b) => a - b);
    const max = d3.max(filtered, (d) => d.delinquencyRate) ?? 0.1;

    // Build lookup map
    const map = new Map<string, number>();
    filtered.forEach((d) => {
      map.set(`${d.vintage}|${d.mob}`, d.delinquencyRate);
    });

    return { vintages: sorted, mobs: mobSet, maxRate: max, cellMap: map };
  }, [filtered]);

  const chartHeight = Math.max(400, vintages.length * ROW_H + MARGIN.top + MARGIN.bottom);
  const chartMinWidth = mobs.length * MIN_CELL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand<number>()
        .domain(mobs)
        .range([0, w])
        .padding(0.04);

      const y = d3
        .scaleBand<string>()
        .domain(vintages)
        .range([0, h])
        .padding(0.04);

      // Color: green (low delinquency) → red (high delinquency)
      const colorScale = d3
        .scaleSequential(d3.interpolateRdYlGn)
        .domain([maxRate, 0]);

      // Build cell data
      const cells: { vintage: string; mob: number; rate: number }[] = [];
      vintages.forEach((v) => {
        mobs.forEach((m) => {
          const rate = cellMap.get(`${v}|${m}`);
          if (rate != null) {
            cells.push({ vintage: v, mob: m, rate });
          }
        });
      });

      // Render cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.mob)!)
        .attr('y', (d) => y(d.vintage)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.rate))
        .attr('rx', 2)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Rate labels inside cells (only if cell wide enough)
      g.selectAll('text.cell-label')
        .data(cells)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.mob)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.vintage)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.rate > maxRate * 0.6 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(12, x.bandwidth() * 0.45) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 36 || y.bandwidth() < 18) return '';
          return formatPercent(d.rate, 1);
        });

      // Y axis (vintage labels)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px');

      g.selectAll('.domain').remove();

      // X axis (MOB numbers)
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0).tickFormat((d) => `${d}`))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 32)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Months on Book (MOB)');
    },
    [filtered, vintages, mobs, maxRate, cellMap, d3Tokens],
  );

  return (
    <ChartContainer
      title={`Vintage Heatmap \u2014 ${metricType}`}
      subtitle="Delinquency rate by vintage and MOB"
      height={chartHeight}
      empty={!filtered.length}
      fillHeight={fillHeight}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
