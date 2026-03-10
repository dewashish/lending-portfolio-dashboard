'use client';

import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import type { CorporateRatingMigrationRow } from '@/lib/types';

interface Props {
  data: CorporateRatingMigrationRow[];
}

const RATING_GROUPS = [
  { label: 'AAA/AA', bands: ['AAA', 'AA+', 'AA', 'AA-'] },
  { label: 'A+/A/A-', bands: ['A+', 'A'] },
  { label: 'BBB+/BBB/BBB-', bands: ['BBB+', 'BBB'] },
  { label: 'BB+/BB/BB-', bands: ['BB+', 'BB'] },
  { label: 'B+/B/B-', bands: ['B'] },
  { label: 'CCC/D', bands: ['C/D', 'Unrated'] },
] as const;

const GROUP_LABELS = RATING_GROUPS.map((g) => g.label);

/** Map every individual band to its group index (0-5). */
const BAND_TO_GROUP: Record<string, number> = {};
RATING_GROUPS.forEach((group, idx) => {
  group.bands.forEach((band) => {
    BAND_TO_GROUP[band] = idx;
  });
});

interface MatrixCell {
  fromGroup: string;
  toGroup: string;
  fromIdx: number;
  toIdx: number;
  count: number;
}

const MARGIN = { top: 56, right: 20, bottom: 20, left: 110 };
const ROW_H = 56;
const MIN_CELL_W = 100;

export function RatingMigrationMatrix({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const matrix = useMemo(() => {
    // Initialise a 6x6 grid of zeros
    const counts: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));

    data.forEach((row) => {
      const fromIdx = BAND_TO_GROUP[row.priorRating];
      const toIdx = BAND_TO_GROUP[row.currentRating];
      if (fromIdx !== undefined && toIdx !== undefined) {
        counts[fromIdx][toIdx] += 1;
      }
    });

    const cells: MatrixCell[] = [];
    GROUP_LABELS.forEach((from, fi) => {
      GROUP_LABELS.forEach((to, ti) => {
        cells.push({
          fromGroup: from,
          toGroup: to,
          fromIdx: fi,
          toIdx: ti,
          count: counts[fi][ti],
        });
      });
    });
    return cells;
  }, [data]);

  const maxCount = useMemo(() => Math.max(1, ...matrix.map((c) => c.count)), [matrix]);

  const chartHeight = GROUP_LABELS.length * ROW_H + MARGIN.top + MARGIN.bottom;
  const chartMinWidth = GROUP_LABELS.length * MIN_CELL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      /* ── Tooltip (body-appended, d3Tokens themed) ─────────────── */
      d3.selectAll('.rating-migration-tooltip').remove();

      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'rating-migration-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('max-width', '260px')
        .style('line-height', '1.5');

      /* ── Scales ───────────────────────────────────────────────── */
      const w = width - MARGIN.left - MARGIN.right;
      const h = height - MARGIN.top - MARGIN.bottom;
      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      const x = d3.scaleBand<string>().domain(GROUP_LABELS).range([0, w]).padding(0.06);
      const y = d3.scaleBand<string>().domain(GROUP_LABELS).range([0, h]).padding(0.06);

      /* ── Cell color function ──────────────────────────────────── */
      const cellColor = (fromIdx: number, toIdx: number, count: number): string => {
        if (count === 0) return d3Tokens.tooltipBorder; // very faint / transparent
        const t = Math.min(count / maxCount, 1) * 0.85 + 0.1; // 0.1..0.95 range
        if (fromIdx === toIdx) return d3.interpolateBlues(t);
        if (toIdx < fromIdx) return d3.interpolateGreens(t); // upgrade
        return d3.interpolateReds(t); // downgrade
      };

      /* ── Draw cells ───────────────────────────────────────────── */
      g.selectAll('rect.cell')
        .data(matrix)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.toGroup)!)
        .attr('y', (d) => y(d.fromGroup)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => cellColor(d.fromIdx, d.toIdx, d.count))
        .attr('rx', 3)
        .attr('opacity', (d) => (d.count === 0 ? 0.25 : 0.9))
        .style('cursor', 'default')
        .on('click', () => {
          tooltip.style('opacity', '0');
          d3.selectAll('.rating-migration-tooltip').remove();
        })
        .on('mouseover', function (event: MouseEvent, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          if (d.count === 0) return;
          const direction =
            d.toIdx < d.fromIdx ? 'Upgrade' : d.toIdx > d.fromIdx ? 'Downgrade' : 'Stable';
          const dirColor =
            direction === 'Upgrade' ? '#4caf50' : direction === 'Downgrade' ? '#f44336' : '#42a5f5';
          tooltip
            .html(
              `<div style="font-weight:700;margin-bottom:4px">From: ${d.fromGroup} &rarr; To: ${d.toGroup}</div>` +
                `<div style="margin-bottom:4px">Count: <strong style="font-family:'IBM Plex Mono',monospace">${d.count}</strong></div>` +
                `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dirColor};margin-right:6px;vertical-align:middle"></span>${direction}</div>`,
            )
            .style('opacity', '1');
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = event.pageX + 16;
          const top = Math.max(8, event.pageY - 20);
          if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function (_, d) {
          d3.select(this)
            .attr('opacity', d.count === 0 ? 0.25 : 0.9)
            .attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      /* ── Cell labels (integer counts, hide zeros) ─────────────── */
      g.selectAll('text.cell-label')
        .data(matrix)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.toGroup)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.fromGroup)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => {
          if (d.count === 0) return 'transparent';
          const t = Math.min(d.count / maxCount, 1) * 0.85 + 0.1;
          return t > 0.5 ? '#fff' : '#1e293b';
        })
        .attr('font-size', Math.min(13, x.bandwidth() * 0.18) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 36 || y.bandwidth() < 20) return '';
          if (d.count === 0) return '';
          return d.count.toString();
        });

      /* ── X axis (To Rating) — top ─────────────────────────────── */
      g.append('g')
        .attr('transform', 'translate(0,-6)')
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // X axis title
      g.append('text')
        .attr('x', w / 2)
        .attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('To Rating');

      /* ── Y axis (From Rating) ─────────────────────────────────── */
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
        .attr('y', -90)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('From Rating');
    },
    [matrix, maxCount, d3Tokens],
  );

  return (
    <ChartContainer
      title="Rating Migration Matrix (YTD)"
      subtitle="Facility count by grouped rating transition"
      height={chartHeight}
      empty={!data.length}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>

      {/* Legend row */}
      <Stack
        direction="row"
        spacing={2.5}
        sx={{ mt: 1.5, px: 1, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {[
          { color: '#4caf50', label: 'Upgrade (above diagonal)' },
          { color: '#f44336', label: 'Downgrade (below diagonal)' },
          { color: '#42a5f5', label: 'No Change (diagonal)' },
          { color: '#9e9e9e', label: 'No movement' },
        ].map((item) => (
          <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '2px',
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Box sx={{ fontSize: '11px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {item.label}
            </Box>
          </Stack>
        ))}
      </Stack>
    </ChartContainer>
  );
}
