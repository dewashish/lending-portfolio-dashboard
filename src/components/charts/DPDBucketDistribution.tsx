'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import { BUCKET_COLORS, DPD_BUCKETS } from '@/lib/constants';
import type { NetFlowRow, DPDBucket } from '@/lib/types';

interface Props {
  data: NetFlowRow[];
}

const LATE_STAGE: DPDBucket[] = ['31-60', '61-90', '91-120', '120+', 'Write-off'];

export function DPDBucketDistribution({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  /* ── data processing ──────────────────────────────────────── */
  const { periods, processed, bucketKeys } = useMemo(() => {
    const filtered = data.filter(
      (r) =>
        r.bucket.includes('DPD') ||
        r.bucket.includes('Current') ||
        r.bucket.includes('FWOF'),
    );

    const periodSet = new Set<string>();
    filtered.forEach((r) => Object.keys(r.values).forEach((k) => periodSet.add(k)));
    const sortedPeriods = Array.from(periodSet).sort();

    // Determine unique bucket keys present in the data (in DPD_BUCKETS order)
    const foundKeys = new Set<DPDBucket>();
    filtered.forEach((r) => {
      const match = DPD_BUCKETS.find((b) => r.bucket.includes(b));
      foundKeys.add(match ?? ('Current' as DPDBucket));
    });
    const orderedKeys = DPD_BUCKETS.filter((b) => foundKeys.has(b));

    // Aggregate values by bucket key per period
    const proc = sortedPeriods.map((p) => {
      const aggMap = new Map<DPDBucket, number>();
      filtered.forEach((r) => {
        const match = DPD_BUCKETS.find((b) => r.bucket.includes(b)) ?? ('Current' as DPDBucket);
        aggMap.set(match, (aggMap.get(match) ?? 0) + Math.abs(r.values[p] ?? 0));
      });

      const segments = orderedKeys.map((bk) => ({
        bucketKey: bk,
        absValue: aggMap.get(bk) ?? 0,
      }));
      const total = segments.reduce((s, seg) => s + seg.absValue, 0) || 1;
      return {
        period: p,
        segments: segments.map((seg) => ({
          ...seg,
          pct: seg.absValue / total,
        })),
        total,
      };
    });

    return { periods: sortedPeriods, processed: proc, bucketKeys: orderedKeys };
  }, [data]);

  /* ── D3 render ────────────────────────────────────────────── */
  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any stale tooltips
      d3.selectAll('.dpd-tooltip').remove();

      const margin = { top: 24, right: 20, bottom: 60, left: 60 };
      const w = width - margin.left - margin.right;
      const gap = 20;
      const legendH = 28;
      const innerH = height - margin.top - margin.bottom - legendH;
      const topH = innerH * 0.52 - gap / 2;
      const botH = innerH * 0.42 - gap / 2;
      const botTop = margin.top + topH + gap;

      const x = d3.scaleBand<string>().domain(periods).range([0, w]).padding(0.2);

      /* ── Top panel: 100% stacked ──────────────────────────── */
      const gTop = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const yTop = d3.scaleLinear().domain([0, 100]).range([topH, 0]);

      // Panel label
      gTop
        .append('text')
        .attr('x', 0)
        .attr('y', -8)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .text('Distribution (%)');

      // Top panel bars
      processed.forEach((pd) => {
        let cumPct = 0;
        pd.segments.forEach((seg) => {
          const pct = seg.pct * 100;
          gTop
            .append('rect')
            .attr('x', x(pd.period)!)
            .attr('y', yTop(cumPct + pct))
            .attr('width', x.bandwidth())
            .attr('height', Math.max(0, yTop(cumPct) - yTop(cumPct + pct)))
            .attr('fill', BUCKET_COLORS[seg.bucketKey])
            .attr('opacity', 0.9)
            .attr('rx', 1);
          cumPct += pct;
        });
      });

      // Top Y axis
      gTop
        .append('g')
        .call(
          d3
            .axisLeft(yTop)
            .tickValues([0, 25, 50, 75, 100])
            .tickFormat((d) => `${d}%`)
            .tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');
      gTop.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      gTop.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      /* ── Bottom panel: late-stage detail ──────────────────── */
      const gBot = svg.append('g').attr('transform', `translate(${margin.left},${botTop})`);

      const maxLate =
        d3.max(processed, (pd) =>
          pd.segments
            .filter((s) => LATE_STAGE.includes(s.bucketKey))
            .reduce((sum, s) => sum + s.absValue, 0),
        ) ?? 1;

      const hasLateStage = maxLate > 0;
      const yBot = d3.scaleLinear().domain([0, maxLate * 1.1]).nice().range([botH, 0]);

      // Panel label
      gBot
        .append('text')
        .attr('x', 0)
        .attr('y', -8)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .text('Late-Stage Detail');

      if (hasLateStage) {
        // Bottom bars
        processed.forEach((pd) => {
          let cumVal = 0;
          pd.segments
            .filter((s) => LATE_STAGE.includes(s.bucketKey))
            .forEach((seg) => {
              gBot
                .append('rect')
                .attr('x', x(pd.period)!)
                .attr('y', yBot(cumVal + seg.absValue))
                .attr('width', x.bandwidth())
                .attr('height', Math.max(0, yBot(cumVal) - yBot(cumVal + seg.absValue)))
                .attr('fill', BUCKET_COLORS[seg.bucketKey])
                .attr('opacity', 0.9)
                .attr('rx', 1);
              cumVal += seg.absValue;
            });
        });

        // Bottom Y axis
        gBot
          .append('g')
          .call(d3.axisLeft(yBot).ticks(4).tickFormat((d) => formatCurrency(+d)).tickSize(-w))
          .selectAll('text')
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px');
        gBot.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
        gBot.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);
      } else {
        gBot
          .append('text')
          .attr('x', w / 2)
          .attr('y', botH / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.textFaint)
          .attr('font-size', '12px')
          .text('No late-stage delinquency');
      }

      // Bottom X axis (shared labels)
      gBot
        .append('g')
        .attr('transform', `translate(0,${botH})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-40)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');
      gBot.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      /* ── Separator line between panels ────────────────────── */
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', botTop - gap / 2)
        .attr('y2', botTop - gap / 2)
        .attr('stroke', d3Tokens.gridStroke)
        .attr('stroke-dasharray', '4,3');

      /* ── Tooltip + crosshair ──────────────────────────────── */
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'dpd-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '12px 16px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '300px')
        .style('line-height', '1.5');

      const crosshair = svg
        .append('line')
        .attr('y1', margin.top)
        .attr('y2', botTop + botH)
        .attr('stroke', d3Tokens.textFaint)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0);

      // Invisible overlay rects per period for hover
      const overlayG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      periods.forEach((p, pi) => {
        const pd = processed[pi];
        overlayG
          .append('rect')
          .attr('x', x(p)! - x.step() * x.padding() / 2)
          .attr('y', 0)
          .attr('width', x.step())
          .attr('height', topH + gap + botH)
          .attr('fill', 'transparent')
          .attr('cursor', 'crosshair')
          .on('mouseenter', (event: MouseEvent) => {
            const cx = margin.left + x(p)! + x.bandwidth() / 2;
            crosshair.attr('x1', cx).attr('x2', cx).attr('opacity', 1);

            // Build tooltip HTML
            let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${p}</div>`;
            html += '<table style="border-collapse:collapse;width:100%">';
            pd.segments.forEach((seg) => {
              html += `<tr>
                <td style="padding:2px 6px 2px 0;white-space:nowrap">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${BUCKET_COLORS[seg.bucketKey]};margin-right:6px;vertical-align:middle"></span>${seg.bucketKey}
                </td>
                <td style="padding:2px 4px;text-align:right;font-family:monospace;font-size:11px">${formatCurrency(seg.absValue)}</td>
                <td style="padding:2px 0 2px 4px;text-align:right;font-family:monospace;font-size:11px;color:${d3Tokens.textMuted}">${formatPercent(seg.pct)}</td>
              </tr>`;
            });
            html += `<tr style="border-top:1px solid ${d3Tokens.tooltipBorder}">
              <td style="padding:4px 6px 0 0;font-weight:600">Total</td>
              <td style="padding:4px 4px 0;text-align:right;font-family:monospace;font-size:11px;font-weight:600">${formatCurrency(pd.total)}</td>
              <td style="padding:4px 0 0 4px;text-align:right;font-family:monospace;font-size:11px;color:${d3Tokens.textMuted}">100%</td>
            </tr>`;
            html += '</table>';

            tooltip.html(html).style('opacity', '1');

            // Position tooltip
            const ttNode = tooltip.node() as HTMLDivElement;
            const ttW = ttNode.offsetWidth;
            const ttH = ttNode.offsetHeight;
            let left = event.pageX + 16;
            let top = event.pageY - ttH / 2;
            if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
            if (top < 8) top = 8;
            if (top + ttH > window.innerHeight - 8) top = window.innerHeight - ttH - 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mousemove', (event: MouseEvent) => {
            const ttNode = tooltip.node() as HTMLDivElement;
            const ttW = ttNode.offsetWidth;
            const ttH = ttNode.offsetHeight;
            let left = event.pageX + 16;
            let top = event.pageY - ttH / 2;
            if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
            if (top < 8) top = 8;
            if (top + ttH > window.innerHeight - 8) top = window.innerHeight - ttH - 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mouseleave', () => {
            crosshair.attr('opacity', 0);
            tooltip.style('opacity', '0');
          });
      });

      /* ── Legend ────────────────────────────────────────────── */
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - legendH})`);

      let legendX = 0;
      bucketKeys.forEach((bk) => {
        legendG
          .append('rect')
          .attr('x', legendX)
          .attr('y', 0)
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', BUCKET_COLORS[bk])
          .attr('rx', 2);

        const label = legendG
          .append('text')
          .attr('x', legendX + 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(bk);

        legendX += (label.node()?.getComputedTextLength() ?? 30) + 24;
      });
    },
    [processed, periods, bucketKeys, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="DPD Bucket Distribution"
      subtitle="Proportional distribution with late-stage detail"
      height={680}
      empty={!processed.length}
    >
      <svg ref={ref} width="100%" height={680} style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
