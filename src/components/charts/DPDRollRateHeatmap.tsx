'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { TradeDPDRollRateRow } from '@/lib/types';

interface Props {
  data: TradeDPDRollRateRow[];
}

const DPD_BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+'] as const;

interface HeatCell {
  fromBucket: string;
  toBucket: string;
  transitionPct: number;
  facilityCount: number;
  balance: number;
}

const ROW_H = 56;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 90 };

export function DPDRollRateHeatmap({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  // Build matrix from latest period
  const { matrix, bucketRows, bucketCols } = useMemo(() => {
    if (!data.length) return { matrix: [] as HeatCell[], bucketRows: [] as string[], bucketCols: [] as string[] };

    // Find latest period
    const periods = Array.from(new Set(data.map((d) => d.period))).sort();
    const latestPeriod = periods[periods.length - 1];
    const filtered = data.filter((d) => d.period === latestPeriod);

    // Collect unique buckets in canonical order
    const fromBuckets: string[] = [];
    const toBuckets: string[] = [];

    DPD_BUCKETS.forEach((b) => {
      if (filtered.some((d) => d.fromBucket === b)) fromBuckets.push(b);
      if (filtered.some((d) => d.toBucket === b)) toBuckets.push(b);
    });

    // Add any buckets not in canonical list
    filtered.forEach((d) => {
      if (!fromBuckets.includes(d.fromBucket)) fromBuckets.push(d.fromBucket);
      if (!toBuckets.includes(d.toBucket)) toBuckets.push(d.toBucket);
    });

    // Build cell lookup
    const cellMap = new Map<string, HeatCell>();
    fromBuckets.forEach((fb) => {
      toBuckets.forEach((tb) => {
        cellMap.set(`${fb}->${tb}`, {
          fromBucket: fb,
          toBucket: tb,
          transitionPct: 0,
          facilityCount: 0,
          balance: 0,
        });
      });
    });

    filtered.forEach((row) => {
      const key = `${row.fromBucket}->${row.toBucket}`;
      const cell = cellMap.get(key);
      if (cell) {
        cell.transitionPct = row.transitionPct;
        cell.facilityCount += row.facilityCount;
        cell.balance += row.balance;
      }
    });

    const cells: HeatCell[] = [];
    cellMap.forEach((cell) => cells.push(cell));
    return { matrix: cells, bucketRows: fromBuckets, bucketCols: toBuckets };
  }, [data]);

  const chartHeight = Math.max(320, bucketRows.length * ROW_H + MARGIN.top + MARGIN.bottom);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(bucketCols).range([0, w]).padding(0.06);
      const y = d3.scaleBand<string>().domain(bucketRows).range([0, h]).padding(0.06);

      // Color scale: green (low transition) to red (high transition)
      const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1, 0]);

      // Draw cells
      g.selectAll('rect.cell')
        .data(matrix)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.toBucket)!)
        .attr('y', (d) => y(d.fromBucket)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.transitionPct))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Percentage labels
      g.selectAll('text.cell-label')
        .data(matrix)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.toBucket)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.fromBucket)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.transitionPct > 0.5 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(13, x.bandwidth() * 0.22) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 28 || y.bandwidth() < 14) return '';
          return formatPercent(d.transitionPct, 1);
        });

      // X axis (To Bucket) - top
      g.append('g')
        .attr('transform', `translate(0,${-6})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
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
        .text('To Bucket');

      // Y axis (From Bucket)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // Y axis title
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -h / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('From Bucket');
    },
    [matrix, bucketRows, bucketCols, d3Tokens],
  );

  return (
    <ChartContainer title="DPD Roll Rate Heatmap" subtitle="DPD bucket transition rates (latest period)" height={chartHeight} empty={!matrix.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
