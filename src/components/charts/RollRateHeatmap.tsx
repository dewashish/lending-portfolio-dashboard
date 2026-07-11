'use client';

import { useMemo } from 'react';
import { Box, Tooltip, IconButton, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent, parsePeriodToNum, sortPeriodsChronologically } from '@/lib/format';
import { useAva } from '@/components/ava/AvaProvider';
import type { RollRateTimeSeries } from '@/lib/types';

interface Props {
  data: RollRateTimeSeries[];
  maxPeriod?: string | null;
}

/** Bucket group prefixes used to insert thicker separator lines */
const BUCKET_PREFIXES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

/** Fixed display order for metrics within each bucket group */
const METRIC_ORDER = ['Resolution', 'Norm', 'Rollback', 'Stab', 'Roll Forward'];

const BUCKET_DICT: { code: string; label: string }[] = [
  { code: 'B1', label: 'Current (0 DPD)' },
  { code: 'B2', label: '1–30 DPD' },
  { code: 'B3', label: '31–60 DPD' },
  { code: 'B4', label: '61–90 DPD' },
  { code: 'B5', label: '91–120 DPD' },
  { code: 'B6', label: '120+ DPD' },
];

const ROW_H = 48;
const MIN_CELL_W = 80;
const MARGIN = { top: 60, right: 20, bottom: 10, left: 170 };

function BucketDictionary() {
  return (
    <Tooltip
      arrow
      placement="left"
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
            Bucket Dictionary
          </Typography>
          {BUCKET_DICT.map((b) => (
            <Typography key={b.code} variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6 }}>
              <strong>{b.code}</strong> = {b.label}
            </Typography>
          ))}
        </Box>
      }
    >
      <IconButton size="small" sx={{ ml: 0.5, p: 0.3 }}>
        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
      </IconButton>
    </Tooltip>
  );
}

export function RollRateHeatmap({ data, maxPeriod }: Props) {
  const { d3Tokens } = useThemeMode();
  const { openAsk } = useAva();

  const { metrics, periods } = useMemo(() => {
    // Sort metrics by bucket prefix then by fixed metric order
    const metricNames = data.map((d) => d.metric);
    const sorted = [...metricNames].sort((a, b) => {
      const prefixA = BUCKET_PREFIXES.find((p) => a.startsWith(p)) ?? '';
      const prefixB = BUCKET_PREFIXES.find((p) => b.startsWith(p)) ?? '';
      const bucketDiff = BUCKET_PREFIXES.indexOf(prefixA) - BUCKET_PREFIXES.indexOf(prefixB);
      if (bucketDiff !== 0) return bucketDiff;
      // Within same bucket, sort by fixed metric order
      const suffixA = a.replace(/^B\d\s*/, '');
      const suffixB = b.replace(/^B\d\s*/, '');
      const orderA = METRIC_ORDER.findIndex((m) => suffixA === m);
      const orderB = METRIC_ORDER.findIndex((m) => suffixB === m);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });

    const periodSet = new Set<string>();
    data.forEach((row) => Object.keys(row.values).forEach((k) => periodSet.add(k)));
    // Sort chronologically descending (most recent first / leftmost)
    let sortedPeriods = sortPeriodsChronologically(Array.from(periodSet), true);
    // If maxPeriod is set, filter to periods <= maxPeriod
    if (maxPeriod) {
      const maxNum = parsePeriodToNum(maxPeriod);
      sortedPeriods = sortedPeriods.filter((p) => parsePeriodToNum(p) <= maxNum);
    }
    return { metrics: sorted, periods: sortedPeriods };
  }, [data, maxPeriod]);

  // Determine which row indices start a new bucket group (for separator lines)
  const groupStartIndices = useMemo(() => {
    const indices: number[] = [];
    let lastPrefix = '';
    metrics.forEach((m, i) => {
      const prefix = BUCKET_PREFIXES.find((p) => m.startsWith(p)) ?? '';
      if (prefix && prefix !== lastPrefix && i > 0) {
        indices.push(i);
      }
      lastPrefix = prefix;
    });
    return indices;
  }, [metrics]);

  // Identify Resolution rows for bold styling
  const resolutionMetrics = useMemo(
    () => new Set(metrics.filter((m) => m.replace(/^B\d\s*/, '') === 'Resolution')),
    [metrics],
  );

  const chartHeight = Math.max(400, metrics.length * ROW_H + MARGIN.top + MARGIN.bottom);
  const chartMinWidth = periods.length * MIN_CELL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(periods).range([0, w]).padding(0.04);
      const y = d3.scaleBand<string>().domain(metrics).range([0, h]).padding(0.04);

      // Color: green (0 = good resolution) → red (1 = bad roll-forward)
      const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1, 0]);

      // Build flat cell data
      const cells: { metric: string; period: string; value: number; isResolution: boolean }[] = [];
      data.forEach((row) => {
        periods.forEach((p) => {
          if (row.values[p] != null) {
            cells.push({ metric: row.metric, period: p, value: row.values[p], isResolution: resolutionMetrics.has(row.metric) });
          }
        });
      });

      // Draw cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.period)!)
        .attr('y', (d) => y(d.metric)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.value))
        .attr('rx', 2)
        .attr('opacity', 0.9)
        .attr('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        })
        .on('click', (event: MouseEvent, d) => {
          openAsk(
            {
              insightId: 'consumer.collections.bucket',
              breadcrumb: ['Consumer', 'Collections', 'Roll Rate Heatmap'],
              selection: [`${d.metric} · ${d.period} · ${formatPercent(d.value, 1)}`],
              params: { bucket: d.metric, metric: d.metric, period: d.period, value: formatPercent(d.value, 1) },
            },
            { position: { top: event.clientY, left: event.clientX } },
          );
        });

      // Percentage labels inside cells
      g.selectAll('text.cell-label')
        .data(cells)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.period)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.metric)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.value > 0.6 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(12, y.bandwidth() * 0.55) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', (d) => (d.isResolution ? 700 : 400))
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 40 || y.bandwidth() < 18) return '';
          return formatPercent(d.value, 1);
        });

      // Group separator lines
      groupStartIndices.forEach((idx) => {
        const yPos = y(metrics[idx])! - y.step() * y.padding() / 2;
        g.append('line')
          .attr('x1', 0)
          .attr('x2', w)
          .attr('y1', yPos)
          .attr('y2', yPos)
          .attr('stroke', d3Tokens.textMuted)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3');
      });

      // Y axis (metric names) — bold for Resolution rows
      const yAxis = g.append('g').call(d3.axisLeft(y).tickSize(0));
      yAxis.selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', (d) => (resolutionMetrics.has(d as string) ? 700 : 400));

      g.selectAll('.domain').remove();

      // X axis (period labels at top)
      g.append('g')
        .attr('transform', `translate(0,${-4})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('text-anchor', 'start')
        .attr('transform', 'rotate(-45)')
        .attr('dx', '0.5em')
        .attr('dy', '0.2em');

      g.selectAll('.domain').remove();
    },
    [data, metrics, periods, groupStartIndices, resolutionMetrics, d3Tokens],
  );

  return (
    <ChartContainer
      title="Roll Rate Heatmap"
      subtitle={"Transition rates by period \u00b7 Click a cell to ask AVA"}
      ava={{ insightId: 'consumer.collections.efficiency', breadcrumb: ['Consumer', 'Collections', 'Roll Rate Heatmap'] }}
      height={chartHeight}
      empty={!data.length}
      headerRight={<BucketDictionary />}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: chartHeight }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: chartHeight, overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
