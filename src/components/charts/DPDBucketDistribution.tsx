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
}

export function DPDBucketDistribution({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  // Filter to only DPD / Current / FWOF amount buckets
  const { bucketRows, periods, bucketKeys } = useMemo(() => {
    const filtered = data.filter(
      (r) =>
        r.bucket.includes('DPD') ||
        r.bucket.includes('Current') ||
        r.bucket.includes('FWOF'),
    );

    // Collect all periods
    const periodSet = new Set<string>();
    filtered.forEach((r) => Object.keys(r.values).forEach((k) => periodSet.add(k)));
    const sortedPeriods = Array.from(periodSet).sort();

    // Map bucket names to DPD bucket keys for coloring
    const keys = filtered.map((r) => {
      const match = DPD_BUCKETS.find((b) => r.bucket.includes(b));
      return match ?? ('Current' as DPDBucket);
    });

    return { bucketRows: filtered, periods: sortedPeriods, bucketKeys: keys };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 70, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(periods).range([0, w]).padding(0.2);

      // Compute stacked data per period
      const stackedData = periods.map((p) => {
        const segments = bucketRows.map((r, i) => ({
          bucket: r.bucket,
          bucketKey: bucketKeys[i],
          value: r.values[p] ?? 0,
        }));
        return { period: p, segments };
      });

      // Compute max stacked total for y domain
      const maxTotal = d3.max(stackedData, (d) =>
        d.segments.reduce((sum, s) => sum + Math.abs(s.value), 0),
      ) ?? 1;

      const y = d3.scaleLinear().domain([0, maxTotal * 1.05]).nice().range([h, 0]);

      // Draw stacked bars
      stackedData.forEach((period) => {
        let cumY = 0;
        period.segments.forEach((seg) => {
          const barY = y(cumY + Math.abs(seg.value));
          g.append('rect')
            .attr('x', x(period.period)!)
            .attr('y', barY)
            .attr('width', x.bandwidth())
            .attr('height', h - y(Math.abs(seg.value)))
            .attr('fill', BUCKET_COLORS[seg.bucketKey])
            .attr('opacity', 0.9)
            .attr('rx', 1);
          cumY += Math.abs(seg.value);
        });
      });

      // Y axis
      g.append('g')
        .call(
          d3.axisLeft(y).ticks(6).tickFormat((d) => formatCurrency(+d)).tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-40)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Legend
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - 20})`);

      const uniqueBuckets = Array.from(new Set(bucketKeys));
      let legendX = 0;
      uniqueBuckets.forEach((bk) => {
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
    [bucketRows, periods, bucketKeys, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="DPD Bucket Distribution"
      subtitle="Stacked amounts by period"
      height={400}
      empty={!bucketRows.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
