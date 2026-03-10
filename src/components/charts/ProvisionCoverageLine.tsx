'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { EclForecastRow } from '@/lib/types';

const TOOLTIP_CLASS = 'prov-coverage-tooltip';

interface Props {
  data: EclForecastRow[];
  scenario?: string;
}

interface CoveragePoint {
  quarter: string;
  coverage: number;
}

export function ProvisionCoverageLine({ data, scenario = 'Base' }: Props) {
  const { d3Tokens } = useThemeMode();

  const points = useMemo<CoveragePoint[]>(() => {
    if (!data.length) return [];

    // Filter to selected scenario
    const filtered = data.filter((d) => d.scenario === scenario);
    if (!filtered.length) return [];

    // Group by quarter
    const quarterMap = new Map<string, { weightedCov: number; totalEcl: number }>();
    filtered.forEach((row) => {
      const cov = row.coverageRatio;
      if (cov == null) return;
      const existing = quarterMap.get(row.quarter);
      if (existing) {
        existing.weightedCov += cov * row.eclAmount;
        existing.totalEcl += row.eclAmount;
      } else {
        quarterMap.set(row.quarter, {
          weightedCov: cov * row.eclAmount,
          totalEcl: row.eclAmount,
        });
      }
    });

    // Compute weighted-average coverage for each quarter and sort chronologically
    const result: CoveragePoint[] = [];
    quarterMap.forEach((val, quarter) => {
      if (val.totalEcl > 0) {
        result.push({ quarter, coverage: val.weightedCov / val.totalEcl });
      }
    });

    return result.sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [data, scenario]);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any stale tooltips
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 25, right: 80, bottom: 40, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const quarters = points.map((p) => p.quarter);
      const x = d3.scalePoint().domain(quarters).range([0, w]).padding(0.5);

      const coverages = points.map((p) => p.coverage);
      const yMin = (d3.min(coverages) ?? 0) - 0.1;
      const yMax = Math.max((d3.max(coverages) ?? 1) + 0.1, 1.2);
      const y = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

      // Grid lines via axisLeft
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickFormat((d) => formatPercent(d as number))
            .tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Reference line at 100% (full coverage)
      g.append('line')
        .attr('x1', 0)
        .attr('y1', y(1.0))
        .attr('x2', w)
        .attr('y2', y(1.0))
        .attr('stroke', '#4caf50')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4');

      g.append('text')
        .attr('x', w + 6)
        .attr('y', y(1.0))
        .attr('dy', '0.35em')
        .attr('fill', '#4caf50')
        .attr('font-size', '9px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text('Full Coverage');

      // Line
      const lineGen = d3
        .line<CoveragePoint>()
        .x((d) => x(d.quarter)!)
        .y((d) => y(d.coverage))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(points)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', '#00897b')
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.9);

      // Tooltip (body-appended)
      const tooltip = d3.select('body').append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '11px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.6')
        .style('transition', 'opacity 0.15s ease');

      const mutedColor = d3Tokens.textMuted;

      function positionTooltip(event: MouseEvent) {
        const ttNode = tooltip.node() as HTMLDivElement;
        const ttW = ttNode.offsetWidth;
        const ttH = ttNode.offsetHeight;
        let left = event.pageX + 12;
        let top = event.pageY - 10;
        if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 12;
        if (top + ttH > window.innerHeight + window.scrollY - 8) top = event.pageY - ttH - 10;
        if (top < window.scrollY + 4) top = window.scrollY + 4;
        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      }

      // Dots with hover
      g.selectAll('.cov-dot')
        .data(points)
        .join('circle')
        .attr('class', 'cov-dot')
        .attr('cx', (d) => x(d.quarter)!)
        .attr('cy', (d) => y(d.coverage))
        .attr('r', 5)
        .attr('fill', '#00897b')
        .attr('stroke', d3Tokens.bg)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (_event, d) {
          d3.select(this)
            .attr('r', 7)
            .attr('stroke-width', 3);
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.quarter}</div>` +
            `<div><span style="color:${mutedColor}">Coverage Ratio:</span> <b>${formatPercent(d.coverage)}</b></div>`,
          ).style('opacity', '1');
          positionTooltip(_event as unknown as MouseEvent);
        })
        .on('mousemove', function (_event) {
          positionTooltip(_event as unknown as MouseEvent);
        })
        .on('mouseout', function () {
          d3.select(this)
            .attr('r', 5)
            .attr('stroke-width', 2);
          tooltip.style('opacity', '0');
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
    },
    [points, d3Tokens],
  );

  return (
    <ChartContainer
      title="Provision Coverage Trend"
      subtitle={`Weighted avg coverage ratio \u2014 ${scenario} scenario`}
      empty={!points.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
