'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { MacroCreditLinkageRow } from '@/lib/types';

interface Props {
  data: MacroCreditLinkageRow[];
  macroVariable?: string;
}

const MACRO_COLOR = '#2196f3';
const CREDIT_COLOR = '#f44336';

export function MacroCreditLinkage({ data, macroVariable }: Props) {
  const { d3Tokens } = useThemeMode();

  const selectedVariable = useMemo(() => {
    if (macroVariable) return macroVariable;
    const variables = Array.from(new Set(data.map((d) => d.macroVariable)));
    return variables[0] ?? '';
  }, [data, macroVariable]);

  const filtered = useMemo(
    () => data.filter((d) => d.macroVariable === selectedVariable),
    [data, selectedVariable],
  );

  const { periods, macroLabel, creditLabel, leadMonths } = useMemo(() => {
    const pds = filtered.map((d) => d.period);
    const macro = selectedVariable;
    const credit = filtered[0]?.creditMetric ?? 'Credit Metric';
    const lead = filtered[0]?.leadMonths ?? 0;
    return { periods: pds, macroLabel: macro, creditLabel: credit, leadMonths: lead };
  }, [filtered, selectedVariable]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 28, right: 56, bottom: 50, left: 56 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.3);

      const macroExtent = d3.extent(filtered, (d) => d.macroValue) as [number, number];
      const creditExtent = d3.extent(filtered, (d) => d.creditValue) as [number, number];

      const yLeft = d3
        .scaleLinear()
        .domain([macroExtent[0] * 0.9, macroExtent[1] * 1.1])
        .nice()
        .range([h, 0]);

      const yRight = d3
        .scaleLinear()
        .domain([creditExtent[0] * 0.9, creditExtent[1] * 1.1])
        .nice()
        .range([h, 0]);

      // Grid from left axis
      g.append('g')
        .call(d3.axisLeft(yLeft).ticks(6).tickSize(-w))
        .selectAll('text')
        .attr('fill', MACRO_COLOR)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Right axis
      g.append('g')
        .attr('transform', `translate(${w},0)`)
        .call(
          d3
            .axisRight(yRight)
            .ticks(6)
            .tickFormat((d) => formatPercent(+d, 1)),
        )
        .selectAll('text')
        .attr('fill', CREDIT_COLOR)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px')
        .attr('transform', 'rotate(-35)')
        .attr('text-anchor', 'end');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Macro line (blue, left axis)
      const macroLine = d3
        .line<MacroCreditLinkageRow>()
        .x((d) => x(d.period)!)
        .y((d) => yLeft(d.macroValue))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(filtered)
        .attr('d', macroLine)
        .attr('fill', 'none')
        .attr('stroke', MACRO_COLOR)
        .attr('stroke-width', 2)
        .attr('opacity', 0.85);

      g.selectAll('.dot-macro')
        .data(filtered)
        .join('circle')
        .attr('cx', (d) => x(d.period)!)
        .attr('cy', (d) => yLeft(d.macroValue))
        .attr('r', 3.5)
        .attr('fill', MACRO_COLOR)
        .attr('stroke', d3Tokens.bg)
        .attr('stroke-width', 1);

      // Credit line (red, right axis)
      const creditLine = d3
        .line<MacroCreditLinkageRow>()
        .x((d) => x(d.period)!)
        .y((d) => yRight(d.creditValue))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(filtered)
        .attr('d', creditLine)
        .attr('fill', 'none')
        .attr('stroke', CREDIT_COLOR)
        .attr('stroke-width', 2)
        .attr('opacity', 0.85);

      g.selectAll('.dot-credit')
        .data(filtered)
        .join('circle')
        .attr('cx', (d) => x(d.period)!)
        .attr('cy', (d) => yRight(d.creditValue))
        .attr('r', 3.5)
        .attr('fill', CREDIT_COLOR)
        .attr('stroke', d3Tokens.bg)
        .attr('stroke-width', 1);

      // Legend at top
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${12})`);

      // Macro legend
      legendG
        .append('line')
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 14)
        .attr('y2', 5)
        .attr('stroke', MACRO_COLOR)
        .attr('stroke-width', 2);

      legendG
        .append('circle')
        .attr('cx', 7)
        .attr('cy', 5)
        .attr('r', 2.5)
        .attr('fill', MACRO_COLOR);

      const macroLabelEl = legendG
        .append('text')
        .attr('x', 18)
        .attr('y', 9)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '9px')
        .text(macroLabel);

      const macroLabelW = (macroLabelEl.node()?.getComputedTextLength() ?? 60) + 28;

      // Credit legend
      legendG
        .append('line')
        .attr('x1', macroLabelW)
        .attr('y1', 5)
        .attr('x2', macroLabelW + 14)
        .attr('y2', 5)
        .attr('stroke', CREDIT_COLOR)
        .attr('stroke-width', 2);

      legendG
        .append('circle')
        .attr('cx', macroLabelW + 7)
        .attr('cy', 5)
        .attr('r', 2.5)
        .attr('fill', CREDIT_COLOR);

      legendG
        .append('text')
        .attr('x', macroLabelW + 18)
        .attr('y', 9)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '9px')
        .text(creditLabel);
    },
    [filtered, periods, macroLabel, creditLabel, d3Tokens],
  );

  return (
    <ChartContainer
      title="Macro-Credit Linkage"
      subtitle={`Lead: ${leadMonths} months`}
      empty={!filtered.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
