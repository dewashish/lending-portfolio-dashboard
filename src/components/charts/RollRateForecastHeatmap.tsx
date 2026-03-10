'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { RollRateForecastRow } from '@/lib/types';

interface Props {
  data: RollRateForecastRow[];
}

const BUCKETS = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'] as const;
const FORECAST_MONTHS = [1, 2, 3] as const;

const MARGIN = { top: 42, right: 12, bottom: 12, left: 66 };
const PANEL_GAP = 24;

interface ForecastCell {
  fromBucket: string;
  toBucket: string;
  forecastMonth: number;
  transitionRate: number;
}

export function RollRateForecastHeatmap({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const cells = useMemo(() => {
    const result: ForecastCell[] = [];
    FORECAST_MONTHS.forEach((month) => {
      BUCKETS.forEach((from) => {
        BUCKETS.forEach((to) => {
          const match = data.find(
            (d) => d.fromBucket === from && d.toBucket === to && d.forecastMonth === month,
          );
          result.push({
            fromBucket: from,
            toBucket: to,
            forecastMonth: month,
            transitionRate: match?.transitionRate ?? 0,
          });
        });
      });
    });
    return result;
  }, [data]);

  const chartHeight = BUCKETS.length * 48 + MARGIN.top + MARGIN.bottom + 20;

  const ref = useD3Chart(
    (svg, width, height) => {
      const availW = width - MARGIN.left - MARGIN.right;
      const panelW = (availW - PANEL_GAP * (FORECAST_MONTHS.length - 1)) / FORECAST_MONTHS.length;
      const h = height - MARGIN.top - MARGIN.bottom;

      // Inverted RdYlGn: high values = red (bad), low values = green (good)
      const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.5, 0]);

      FORECAST_MONTHS.forEach((month, panelIdx) => {
        const panelX = MARGIN.left + panelIdx * (panelW + PANEL_GAP);
        const g = svg.append('g').attr('transform', `translate(${panelX},${MARGIN.top})`);

        const x = d3.scaleBand<string>().domain([...BUCKETS]).range([0, panelW]).padding(0.06);
        const y = d3.scaleBand<string>().domain([...BUCKETS]).range([0, h]).padding(0.06);

        const panelCells = cells.filter((c) => c.forecastMonth === month);

        // Panel title
        g.append('text')
          .attr('x', panelW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text(`Month ${month}`);

        // Cells
        g.selectAll('rect.cell')
          .data(panelCells)
          .join('rect')
          .attr('class', 'cell')
          .attr('x', (d) => x(d.toBucket)!)
          .attr('y', (d) => y(d.fromBucket)!)
          .attr('width', x.bandwidth())
          .attr('height', y.bandwidth())
          .attr('fill', (d) => colorScale(d.transitionRate))
          .attr('rx', 2)
          .attr('opacity', 0.9)
          .on('mouseover', function () {
            d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          });

        // Cell labels
        g.selectAll('text.cell-label')
          .data(panelCells)
          .join('text')
          .attr('class', 'cell-label')
          .attr('x', (d) => x(d.toBucket)! + x.bandwidth() / 2)
          .attr('y', (d) => y(d.fromBucket)! + y.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', (d) => (d.transitionRate > 0.25 ? '#fff' : '#1e293b'))
          .attr('font-size', Math.min(10, x.bandwidth() * 0.22) + 'px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .attr('font-weight', '600')
          .attr('pointer-events', 'none')
          .text((d) => {
            if (x.bandwidth() < 28 || y.bandwidth() < 18) return '';
            if (d.transitionRate === 0) return '';
            return formatPercent(d.transitionRate, 1);
          });

        // X axis (To Bucket) - top of each panel
        g.append('g')
          .attr('transform', `translate(0,${-4})`)
          .call(d3.axisTop(x).tickSize(0))
          .selectAll('text')
          .attr('fill', d3Tokens.textFaint)
          .attr('font-size', Math.min(9, x.bandwidth() * 0.18) + 'px')
          .attr('font-weight', '500');

        g.selectAll('.domain').remove();

        // Y axis (From Bucket) - only on first panel
        if (panelIdx === 0) {
          g.append('g')
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll('text')
            .attr('fill', d3Tokens.text)
            .attr('font-size', '10px')
            .attr('font-weight', '600');

          g.selectAll('.domain').remove();
        }
      });
    },
    [cells, d3Tokens],
  );

  return (
    <ChartContainer
      title="Roll Rate Forecast"
      subtitle="Projected transition rates by forecast month"
      height={chartHeight}
      empty={!data.length}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg ref={ref} style={{ width: '100%', height: '100%', overflow: 'visible' }} />
      </Box>
    </ChartContainer>
  );
}
