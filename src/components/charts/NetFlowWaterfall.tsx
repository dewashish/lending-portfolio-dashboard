'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { BUCKET_COLORS, DPD_BUCKETS } from '@/lib/constants';
import type { NetFlowRow, DPDBucket } from '@/lib/types';

interface Props {
  data: NetFlowRow[];
  selectedPeriod?: string;
}

/** DPD bucket keywords to match against bucket names */
const BUCKET_PATTERNS = ['Current', '1-30', '31-60', '61-90', '91-120', '120+', 'Write-off', 'FWOF'];

export function NetFlowWaterfall({ data, selectedPeriod }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const { bars, period } = useMemo(() => {
    if (!data.length) return { bars: [], period: '' };

    // Determine period keys available
    const allPeriods = new Set<string>();
    data.forEach((r) => Object.keys(r.values).forEach((k) => allPeriods.add(k)));
    const sortedPeriods = Array.from(allPeriods).sort();
    const activePeriod = selectedPeriod && allPeriods.has(selectedPeriod)
      ? selectedPeriod
      : sortedPeriods[sortedPeriods.length - 1] ?? '';

    // Filter rows matching DPD bucket patterns
    const matched = data.filter((r) =>
      BUCKET_PATTERNS.some((p) => r.bucket.includes(p)),
    );

    const result = matched
      .map((r) => {
        const amount = r.values[activePeriod] ?? 0;
        // Determine which DPD bucket color to use
        const bucketKey =
          DPD_BUCKETS.find((b) => r.bucket.includes(b)) ?? ('Current' as DPDBucket);
        return { bucket: r.bucket, amount, color: BUCKET_COLORS[bucketKey] };
      })
      .filter((d) => d.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return { bars: result, period: activePeriod };
  }, [data, selectedPeriod]);

  const chartHeight = Math.max(320, bars.length * 40 + 40);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 100, bottom: 30, left: 160 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const y = d3
        .scaleBand<string>()
        .domain(bars.map((d) => d.bucket))
        .range([0, h])
        .padding(0.25);

      const maxAbs = d3.max(bars, (d) => Math.abs(d.amount)) ?? 1;
      const x = d3.scaleLinear().domain([0, maxAbs * 1.1]).range([0, w]);

      // Bars
      g.selectAll('rect.bar')
        .data(bars)
        .join('rect')
        .attr('class', 'bar')
        .attr('y', (d) => y(d.bucket)!)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => x(Math.abs(d.amount)))
        .attr('fill', (d) => d.color)
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9);
        });

      // Value labels
      g.selectAll('text.val')
        .data(bars)
        .join('text')
        .attr('class', 'val')
        .attr('x', (d) => x(Math.abs(d.amount)) + 6)
        .attr('y', (d) => y(d.bucket)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrency(d.amount));

      // Y axis
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px');

      g.selectAll('.domain, .tick line').remove();

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatCurrency(+d)))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);
    },
    [bars, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="Net Flow — DPD Bucket Amounts"
      subtitle={period ? `Period: ${period}` : undefined}
      height={chartHeight}
      empty={!bars.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
