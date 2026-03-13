'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { sortPeriodsChronologically } from '@/lib/format';
import type { CorporateProvisioningRow } from '@/lib/types';

interface Props {
  data: CorporateProvisioningRow[];
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
  'Total CC': '#1976d2',
};

const STAGE_ORDER = ['Stage 1', 'Stage 2', 'Stage 3', 'Total CC'];

const TOOLTIP_CLASS = 'provisioning-trend-tooltip';

/** Abbreviation suffix for period type labels on the X-axis. */
function periodTypeSuffix(pt: 'Actual' | 'Estimated' | 'Projected'): string {
  if (pt === 'Actual') return '(A)';
  if (pt === 'Estimated') return '(E)';
  return '(P)';
}

/** Dash array for a given period type. */
function dashForType(pt: 'Actual' | 'Estimated' | 'Projected'): string | null {
  if (pt === 'Actual') return null; // solid
  if (pt === 'Estimated') return '6,3';
  return '2,3'; // Projected
}

interface PlotPoint {
  period: string;
  periodType: 'Actual' | 'Estimated' | 'Projected';
  creditCostPct: number; // already multiplied by 100
  stage: string;
}

export function ProvisioningTrendChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  // Build sorted periods and compute Total CC
  const { plotData, periods, periodTypeMap } = useMemo(() => {
    if (!data.length) return { plotData: [] as PlotPoint[], periods: [] as string[], periodTypeMap: new Map<string, 'Actual' | 'Estimated' | 'Projected'>() };

    const allPeriods = sortPeriodsChronologically(Array.from(new Set(data.map((d) => d.period))));

    // Map period -> periodType (take the first occurrence)
    const ptMap = new Map<string, 'Actual' | 'Estimated' | 'Projected'>();
    data.forEach((d) => {
      if (!ptMap.has(d.period)) ptMap.set(d.period, d.periodType);
    });

    const points: PlotPoint[] = [];

    // Per-stage credit cost points
    data.forEach((d) => {
      points.push({
        period: d.period,
        periodType: d.periodType,
        creditCostPct: d.creditCost * 100,
        stage: d.ifrsStage,
      });
    });

    // Compute Total CC per period
    allPeriods.forEach((period) => {
      const periodRows = data.filter((d) => d.period === period);
      if (periodRows.length === 0) return;
      const totalProvision = d3.sum(periodRows, (d) => d.provisionAmount);
      const totalExposure = d3.sum(periodRows, (d) => d.grossExposure);
      const totalCC = totalExposure > 0 ? totalProvision / totalExposure : 0;
      points.push({
        period,
        periodType: ptMap.get(period) ?? 'Actual',
        creditCostPct: totalCC * 100,
        stage: 'Total CC',
      });
    });

    return { plotData: points, periods: allPeriods, periodTypeMap: ptMap };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up stale tooltips
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 32, right: 30, bottom: 60, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      if (!plotData.length || !periods.length) return;

      // Determine which stages are present
      const stages = STAGE_ORDER.filter((s) => plotData.some((p) => p.stage === s));

      // ── Scales ──────────────────────────────────────────────────────
      const x = d3.scalePoint().domain(periods).range([0, w]).padding(0.5);

      const allValues = plotData.map((p) => p.creditCostPct);
      const maxVal = d3.max(allValues) ?? 1;
      const y = d3.scaleLinear().domain([0, maxVal * 1.2]).nice().range([h, 0]);

      // ── Grid lines ─────────────────────────────────────────────────
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickSize(-w)
            .tickFormat((d) => `${(d as number).toFixed(2)}%`),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // ── Legend (top of chart area) ─────────────────────────────────
      const legend = g.append('g').attr('transform', 'translate(0, -16)');
      let legendX = 0;
      stages.forEach((stage) => {
        const color = STAGE_COLORS[stage] ?? '#64b5f6';
        const isTotal = stage === 'Total CC';
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);
        lg.append('line')
          .attr('x1', 0)
          .attr('y1', 5)
          .attr('x2', 16)
          .attr('y2', 5)
          .attr('stroke', color)
          .attr('stroke-width', isTotal ? 3 : 2.5);
        lg.append('circle')
          .attr('cx', 8)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', color);
        lg.append('text')
          .attr('x', 20)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(stage);
        legendX += stage.length * 7 + 35;
      });

      // ── Build per-period lookup for tooltip ────────────────────────
      const periodLookup = new Map<string, Map<string, number>>();
      plotData.forEach((p) => {
        if (!periodLookup.has(p.period)) periodLookup.set(p.period, new Map());
        periodLookup.get(p.period)!.set(p.stage, p.creditCostPct);
      });

      // ── Draw lines (segmented by period type) ─────────────────────
      const lineGen = d3
        .line<PlotPoint>()
        .x((d) => x(d.period)!)
        .y((d) => y(d.creditCostPct))
        .curve(d3.curveMonotoneX);

      stages.forEach((stage) => {
        const stagePoints = plotData
          .filter((p) => p.stage === stage)
          .sort((a, b) => periods.indexOf(a.period) - periods.indexOf(b.period));

        if (stagePoints.length === 0) return;

        const color = STAGE_COLORS[stage] ?? '#64b5f6';
        const isTotal = stage === 'Total CC';
        const strokeWidth = isTotal ? 3 : 2.5;

        // Split into segments of consecutive same-periodType, overlapping by 1 point
        const segments: PlotPoint[][] = [];
        let currentSegment: PlotPoint[] = [stagePoints[0]];

        for (let i = 1; i < stagePoints.length; i++) {
          if (stagePoints[i].periodType !== stagePoints[i - 1].periodType) {
            segments.push(currentSegment);
            // Start new segment with the last point of previous segment for continuity
            currentSegment = [stagePoints[i - 1], stagePoints[i]];
          } else {
            currentSegment.push(stagePoints[i]);
          }
        }
        segments.push(currentSegment);

        // Draw each segment with appropriate dash style
        segments.forEach((seg) => {
          // Use the period type of the last point in the segment (the "new" type for overlap segments)
          const segType = seg[seg.length - 1].periodType;
          const dash = dashForType(segType);

          const path = g.append('path')
            .datum(seg)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', strokeWidth)
            .attr('d', lineGen);

          if (dash) {
            path.attr('stroke-dasharray', dash);
          }
        });
      });

      // ── Tooltip (body-appended) ────────────────────────────────────
      const tooltip = d3.select('body').append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '6px')
        .style('padding', '8px 12px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('white-space', 'nowrap')
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

      // ── Draw dots (styled by period type) ─────────────────────────
      stages.forEach((stage) => {
        const stagePoints = plotData
          .filter((p) => p.stage === stage)
          .sort((a, b) => periods.indexOf(a.period) - periods.indexOf(b.period));

        if (stagePoints.length === 0) return;

        const color = STAGE_COLORS[stage] ?? '#64b5f6';
        const safeClass = stage.replace(/\s/g, '-');

        const dots = g.selectAll(`.dot-${safeClass}`)
          .data(stagePoints)
          .join('circle')
          .attr('class', `dot-${safeClass}`)
          .attr('cx', (d) => x(d.period)!)
          .attr('cy', (d) => y(d.creditCostPct))
          .attr('r', 4)
          .style('cursor', 'pointer')
          .style('transition', 'r 150ms ease');

        // Style dots by period type
        dots.each(function (d) {
          const el = d3.select(this);
          if (d.periodType === 'Actual') {
            // Filled circle
            el.attr('fill', color)
              .attr('stroke', d3Tokens.bg)
              .attr('stroke-width', 2);
          } else if (d.periodType === 'Estimated') {
            // White fill, colored stroke
            el.attr('fill', d3Tokens.bg)
              .attr('stroke', color)
              .attr('stroke-width', 2);
          } else {
            // Projected: white fill, colored dashed stroke
            el.attr('fill', d3Tokens.bg)
              .attr('stroke', color)
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '2,2');
          }
        });

        // Hover events on dots — show ALL stages for that period
        dots
          .on('mouseover', function (_event, d) {
            d3.select(this).attr('r', 6);

            const periodValues = periodLookup.get(d.period);
            const pt = periodTypeMap.get(d.period) ?? d.periodType;

            let rows = '';
            STAGE_ORDER.forEach((s) => {
              const val = periodValues?.get(s);
              if (val != null) {
                const sColor = STAGE_COLORS[s] ?? d3Tokens.tooltipText;
                rows += `<div><span style="color:${mutedColor}">${s}:</span> <b style="color:${sColor}">${val.toFixed(2)}%</b></div>`;
              }
            });

            tooltip.html(
              `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.period} (${pt})</div>` +
              `<div style="border-top:1px solid ${d3Tokens.tooltipBorder};margin-bottom:4px"></div>` +
              rows,
            ).style('opacity', '1');

            positionTooltip(_event as unknown as MouseEvent);
          })
          .on('mousemove', function (_event) {
            positionTooltip(_event as unknown as MouseEvent);
          })
          .on('mouseout', function () {
            d3.select(this).attr('r', 4);
            tooltip.style('opacity', '0');
          });
      });

      // ── X-axis ─────────────────────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(
          d3.axisBottom(x)
            .tickSize(0)
            .tickFormat((p) => {
              const pt = periodTypeMap.get(p);
              const suffix = pt ? ` ${periodTypeSuffix(pt)}` : '';
              return `${p}${suffix}`;
            }),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
    },
    [plotData, periods, periodTypeMap, d3Tokens],
  );

  return (
    <ChartContainer
      title="Credit Cost Trend"
      subtitle="Credit cost by IFRS stage over time (Actual \u2192 Estimated \u2192 Projected)"
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible', minHeight: 360 }} />
    </ChartContainer>
  );
}
