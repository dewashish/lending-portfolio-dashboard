'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import type { CET1TrajectoryRow } from '@/lib/types';

interface Props {
  data: CET1TrajectoryRow[];
}

const SCENARIO_COLORS: Record<string, string> = {
  Base: '#2196f3',
  Mild: '#ff9800',
  Severe: '#f44336',
  Stagflation: '#9c27b0',
};

const THRESHOLDS = [
  { value: 4.5, label: 'Pillar 1 Min', color: '#f44336', dash: '6,4' },
  { value: 8.0, label: 'Total Req', color: '#ff9800', dash: '6,4' },
];

interface ScenarioLine {
  scenario: string;
  color: string;
  points: { quarter: string; ratio: number }[];
}

export function CET1TrajectoryChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { lines, quarters } = useMemo(() => {
    if (!data.length) return { lines: [], quarters: [] };

    const qSet = new Set(data.map((d) => d.quarter));
    const sortedQuarters = Array.from(qSet).sort();

    const scenarioMap = new Map<string, { quarter: string; ratio: number }[]>();
    data.forEach((row) => {
      if (!scenarioMap.has(row.scenario)) scenarioMap.set(row.scenario, []);
      scenarioMap.get(row.scenario)!.push({ quarter: row.quarter, ratio: row.cet1Ratio });
    });

    const lineData: ScenarioLine[] = [];
    scenarioMap.forEach((points, scenario) => {
      const sorted = [...points].sort((a, b) =>
        sortedQuarters.indexOf(a.quarter) - sortedQuarters.indexOf(b.quarter),
      );
      lineData.push({
        scenario,
        color: SCENARIO_COLORS[scenario] ?? '#64b5f6',
        points: sorted,
      });
    });

    return { lines: lineData, quarters: sortedQuarters };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 30, right: 100, bottom: 40, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scalePoint().domain(quarters).range([0, w]).padding(0.5);

      const allRatios = data.map((d) => d.cet1Ratio);
      const yMin = Math.min(d3.min(allRatios) ?? 0, THRESHOLDS[0].value - 1);
      const yMax = Math.max(d3.max(allRatios) ?? 15, THRESHOLDS[1].value + 2);
      const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickFormat((d) => `${d}%`)
            .tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Threshold lines
      THRESHOLDS.forEach((t) => {
        g.append('line')
          .attr('x1', 0)
          .attr('y1', y(t.value))
          .attr('x2', w)
          .attr('y2', y(t.value))
          .attr('stroke', t.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', t.dash);

        // Threshold label on the right
        g.append('text')
          .attr('x', w + 6)
          .attr('y', y(t.value))
          .attr('dy', '0.35em')
          .attr('fill', t.color)
          .attr('font-size', '9px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(`${t.value}% ${t.label}`);
      });

      // Lines per scenario
      const lineGen = d3
        .line<{ quarter: string; ratio: number }>()
        .x((d) => x(d.quarter)!)
        .y((d) => y(d.ratio))
        .curve(d3.curveMonotoneX);

      lines.forEach((l) => {
        g.append('path')
          .datum(l.points)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', l.color)
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.9);

        // Dots
        g.selectAll(`.dot-${l.scenario.replace(/\s/g, '')}`)
          .data(l.points)
          .join('circle')
          .attr('cx', (d) => x(d.quarter)!)
          .attr('cy', (d) => y(d.ratio))
          .attr('r', 4)
          .attr('fill', l.color)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 2);
      });

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Legend at top
      const legend = g.append('g').attr('transform', `translate(0, -18)`);
      let legendX = 0;
      lines.forEach((l) => {
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);
        lg.append('line')
          .attr('x1', 0)
          .attr('y1', 5)
          .attr('x2', 16)
          .attr('y2', 5)
          .attr('stroke', l.color)
          .attr('stroke-width', 2.5);
        lg.append('circle')
          .attr('cx', 8)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', l.color);
        lg.append('text')
          .attr('x', 20)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(l.scenario);
        legendX += l.scenario.length * 7 + 35;
      });
    },
    [lines, quarters, d3Tokens],
  );

  return (
    <ChartContainer
      title="CET1 Ratio Trajectory"
      subtitle="Capital adequacy under stress scenarios"
      empty={!lines.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
