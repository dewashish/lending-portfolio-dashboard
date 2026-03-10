'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import type { StressScenarioLossRow } from '@/lib/types';

interface Props {
  data: StressScenarioLossRow[];
}

interface HeatCell {
  segment: string;
  scenario: string;
  lossRate: number;
  lossAmountUsd: number;
}

export function ScenarioLossHeatmap({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const { cells, segments, scenarios, maxRate } = useMemo(() => {
    if (!data.length) return { cells: [], segments: [], scenarios: [], maxRate: 0 };

    const segSet = new Set<string>();
    const scnSet = new Set<string>();
    const cellList: HeatCell[] = [];

    data.forEach((row) => {
      segSet.add(row.segment);
      scnSet.add(row.scenario);
      cellList.push({
        segment: row.segment,
        scenario: row.scenario,
        lossRate: row.lossRate,
        lossAmountUsd: row.lossAmountUsd,
      });
    });

    const segArr = Array.from(segSet);
    const scnArr = Array.from(scnSet);
    const mRate = d3.max(cellList, (d) => d.lossRate) ?? 0.1;

    return { cells: cellList, segments: segArr, scenarios: scnArr, maxRate: mRate };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 50, right: 20, bottom: 20, left: 120 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scaleBand<string>().domain(scenarios).range([0, w]).padding(0.08);
      const y = d3.scaleBand<string>().domain(segments).range([0, h]).padding(0.08);

      // Color scale
      const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxRate]);

      // Draw cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.scenario)!)
        .attr('y', (d) => y(d.segment)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.lossRate))
        .attr('rx', 4)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Top line: loss rate %
      const fontSize = Math.min(12, x.bandwidth() * 0.14);
      g.selectAll('text.rate-label')
        .data(cells)
        .join('text')
        .attr('class', 'rate-label')
        .attr('x', (d) => x(d.scenario)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.segment)! + y.bandwidth() / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', fontSize + 'px')
        .attr('font-weight', '700')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => formatPercent(d.lossRate));

      // Bottom line: loss amount
      g.selectAll('text.amount-label')
        .data(cells)
        .join('text')
        .attr('class', 'amount-label')
        .attr('x', (d) => x(d.scenario)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.segment)! + y.bandwidth() / 2 + 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.75)')
        .attr('font-size', Math.min(10, x.bandwidth() * 0.12) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => formatCurrency(d.lossAmountUsd));

      // X axis (Scenarios) - top
      g.append('g')
        .attr('transform', `translate(0,${-6})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // X axis title
      g.append('text')
        .attr('x', w / 2)
        .attr('y', -32)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('Scenario');

      // Y axis (Segments)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();
    },
    [cells, segments, scenarios, maxRate, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="Stress Scenario Loss Heatmap"
      subtitle="Loss rate and amount by segment and scenario"
      empty={!cells.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
