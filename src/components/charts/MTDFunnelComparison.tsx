'use client';

import { useMemo, useState } from 'react';
import { Select, MenuItem, Typography, Stack } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatNumber, formatPercent } from '@/lib/format';
import { useAva } from '@/components/ava/AvaProvider';
import type { AvaContext } from '@/lib/ava/types';
import type { LOSFunnelStep } from '@/lib/types';

interface Props {
  data: LOSFunnelStep[];
}

type PeriodKey = 'mtd' | 'lmtd' | 'ftd';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  mtd: 'Current MTD',
  lmtd: 'Last Month (same date)',
  ftd: 'Today (FTD)',
};

const TEAL = '#00897b';
const GRAY = '#94a3b8';
const ORANGE = '#ff9800';

const PERIOD_COLORS: Record<PeriodKey, string> = {
  mtd: TEAL,
  lmtd: GRAY,
  ftd: ORANGE,
};

function getValue(stage: LOSFunnelStep, key: PeriodKey): number {
  return stage[key];
}

export function MTDFunnelComparison({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { openAsk } = useAva();
  const [leftPeriod, setLeftPeriod] = useState<PeriodKey>('mtd');
  const [rightPeriod, setRightPeriod] = useState<PeriodKey>('lmtd');

  const stages = useMemo(() => {
    if (!data.length) return [];
    const products = Array.from(new Set(data.map((d) => d.product)));
    const selectedProduct =
      products.find((p) => p.toLowerCase().includes('all')) ?? products[0] ?? '';
    const filtered = data.filter((d) => d.product === selectedProduct);

    // Aggregate across subsidiaries
    const stageOrder: string[] = [];
    const map = new Map<string, LOSFunnelStep>();
    filtered.forEach((d) => {
      const existing = map.get(d.stage);
      if (existing) {
        existing.mtd += d.mtd;
        existing.lmtd += d.lmtd;
        existing.ftd += d.ftd;
      } else {
        stageOrder.push(d.stage);
        map.set(d.stage, { ...d });
      }
    });

    const result = stageOrder.map((s) => map.get(s)!);
    result.forEach((s, i) => {
      s.conversionRate = i === 0 ? 1 : (result[i - 1].mtd > 0 ? s.mtd / result[i - 1].mtd : 0);
    });
    return result;
  }, [data]);

  const leftColor = PERIOD_COLORS[leftPeriod];
  const rightColor = PERIOD_COLORS[rightPeriod];
  const leftLabel = PERIOD_LABELS[leftPeriod];
  const rightLabel = PERIOD_LABELS[rightPeriod];

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll('.mtd-funnel-tooltip').remove();

      const margin = { top: 10, right: 16, bottom: 36, left: 16 };
      const w = width - margin.left - margin.right;
      const stageCount = stages.length;
      const legendH = 28;
      const availH = height - margin.top - margin.bottom - legendH;
      const stepH = availH / Math.max(stageCount, 1);

      const centerGap = Math.min(140, w * 0.22);
      const funnelW = (w - centerGap) / 2;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const leftMax = d3.max(stages, (s) => getValue(s, leftPeriod)) ?? 1;
      const rightMax = d3.max(stages, (s) => getValue(s, rightPeriod)) ?? 1;

      const leftScale = (v: number) => Math.max(funnelW * 0.12, (v / leftMax) * funnelW);
      const rightScale = (v: number) => Math.max(funnelW * 0.12, (v / rightMax) * funnelW);

      const leftCenterX = funnelW / 2;
      const rightCenterX = funnelW + centerGap + funnelW / 2;

      // Tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'mtd-funnel-tooltip')
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
        .style('max-width', '280px')
        .style('line-height', '1.6');

      stages.forEach((stage, i) => {
        const y = i * stepH;
        const nextStage = i < stageCount - 1 ? stages[i + 1] : null;

        const lv = getValue(stage, leftPeriod);
        const rv = getValue(stage, rightPeriod);
        const nlv = nextStage ? getValue(nextStage, leftPeriod) : lv * 0.85;
        const nrv = nextStage ? getValue(nextStage, rightPeriod) : rv * 0.85;

        const lw = leftScale(lv);
        const rw = rightScale(rv);
        const nlw = leftScale(nlv);
        const nrw = rightScale(nrv);

        const gap = 2;

        // Left trapezoid
        const leftPts = [
          [leftCenterX - lw / 2, y + gap],
          [leftCenterX + lw / 2, y + gap],
          [leftCenterX + nlw / 2, y + stepH - gap],
          [leftCenterX - nlw / 2, y + stepH - gap],
        ];
        g.append('polygon')
          .attr('points', leftPts.map((p) => p.join(',')).join(' '))
          .attr('fill', leftColor)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        g.append('text')
          .attr('x', leftCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', stepH > 40 ? '11px' : '9px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(lv, 0));

        // Right trapezoid
        const rightPts = [
          [rightCenterX - rw / 2, y + gap],
          [rightCenterX + rw / 2, y + gap],
          [rightCenterX + nrw / 2, y + stepH - gap],
          [rightCenterX - nrw / 2, y + stepH - gap],
        ];
        g.append('polygon')
          .attr('points', rightPts.map((p) => p.join(',')).join(' '))
          .attr('fill', rightColor)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        g.append('text')
          .attr('x', rightCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', stepH > 40 ? '11px' : '9px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(rv, 0));

        // Center label
        const labelX = funnelW + centerGap / 2;
        const shortName = stage.stage.length > 16 ? stage.stage.slice(0, 16) + '\u2026' : stage.stage;
        g.append('text')
          .attr('x', labelX)
          .attr('y', y + stepH / 2 - 6)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '9px')
          .attr('font-weight', 600)
          .text(shortName);

        // Conversion rate (based on left period)
        if (i > 0) {
          const prevLv = getValue(stages[i - 1], leftPeriod);
          const conv = prevLv > 0 ? lv / prevLv : 0;
          if (conv < 1) {
            g.append('text')
              .attr('x', labelX)
              .attr('y', y + stepH / 2 + 7)
              .attr('dy', '0.35em')
              .attr('text-anchor', 'middle')
              .attr('fill', d3Tokens.textMuted)
              .attr('font-size', '8px')
              .attr('font-family', 'IBM Plex Mono, monospace')
              .text(`\u2193 ${formatPercent(conv, 1)}`);
          }
        }

        // Hover overlay
        g.append('rect')
          .attr('x', 0)
          .attr('y', y)
          .attr('width', w)
          .attr('height', stepH)
          .attr('fill', 'transparent')
          .attr('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            const changePct = rv > 0 ? (lv - rv) / rv : 0;
            const changeSign = changePct >= 0 ? '+' : '';
            const changeColor = changePct >= 0 ? '#4caf50' : '#f44336';
            const prevLv = i > 0 ? getValue(stages[i - 1], leftPeriod) : lv;
            const conv = prevLv > 0 ? lv / prevLv : 1;

            let html = `<div style="font-weight:600;margin-bottom:4px">${stage.stage}</div>`;
            html += `<table style="border-collapse:collapse;width:100%">`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${leftColor};margin-right:6px;vertical-align:middle"></span>${leftLabel}</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatNumber(lv, 0)}</td></tr>`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${rightColor};margin-right:6px;vertical-align:middle"></span>${rightLabel}</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatNumber(rv, 0)}</td></tr>`;
            html += `<tr style="border-top:1px solid ${d3Tokens.tooltipBorder}"><td style="padding:4px 8px 0 0">Change</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px;color:${changeColor}">${changeSign}${formatPercent(changePct, 1)}</td></tr>`;
            if (conv < 1) {
              html += `<tr><td style="padding:2px 8px 2px 0">Conv. Rate</td>`;
              html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatPercent(conv, 1)}</td></tr>`;
            }
            html += `</table>`;
            tooltip.html(html).style('opacity', '1');
            const ttNode = tooltip.node() as HTMLDivElement;
            let left = event.pageX + 16;
            let top = event.pageY - (ttNode.offsetHeight / 2);
            if (left + ttNode.offsetWidth > window.innerWidth - 8) left = event.pageX - ttNode.offsetWidth - 16;
            if (top < 8) top = 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mousemove', (event: MouseEvent) => {
            const ttNode = tooltip.node() as HTMLDivElement;
            let left = event.pageX + 16;
            let top = event.pageY - (ttNode.offsetHeight / 2);
            if (left + ttNode.offsetWidth > window.innerWidth - 8) left = event.pageX - ttNode.offsetWidth - 16;
            if (top < 8) top = 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mouseleave', () => {
            tooltip.style('opacity', '0');
          })
          .on('click', (event: MouseEvent) => {
            tooltip.style('opacity', '0');
            const context: AvaContext = {
              insightId: 'consumer.origination.funnel',
              breadcrumb: ['Consumer', 'Origination', 'Funnel'],
              selection: [`Stage: ${stage.stage}`],
              params: { stage: stage.stage },
            };
            openAsk(context, { position: { top: event.clientY, left: event.clientX } });
          });
      });

      // Legend
      const legendG = svg.append('g').attr('transform', `translate(${margin.left},${height - legendH})`);
      let lx = 0;
      [
        { key: leftLabel, color: leftColor },
        { key: rightLabel, color: rightColor },
      ].forEach(({ key, color }) => {
        legendG.append('rect')
          .attr('x', lx).attr('y', 0).attr('width', 10).attr('height', 10)
          .attr('fill', color).attr('rx', 2);
        const label = legendG.append('text')
          .attr('x', lx + 14).attr('y', 9)
          .attr('fill', d3Tokens.textMuted).attr('font-size', '10px')
          .text(key);
        lx += (label.node()?.getComputedTextLength() ?? 50) + 24;
      });
    },
    [stages, d3Tokens, leftPeriod, rightPeriod, leftColor, rightColor, leftLabel, rightLabel],
  );

  const chartHeight = Math.max(400, stages.length * 56 + 80);

  const selectSx = {
    height: 26,
    fontSize: '0.68rem',
    fontWeight: 600,
    '& .MuiSelect-select': { py: '3px', px: 1 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
  };

  return (
    <ChartContainer
      title="Origination Funnel"
      subtitle="Compare periods — Clicks to Disbursement · Click a stage to ask AVA"
      height={chartHeight}
      empty={!stages.length}
      ava={{
        insightId: 'consumer.origination.funnel',
        breadcrumb: ['Consumer', 'Origination', 'Funnel'],
      }}
      headerRight={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            Left
          </Typography>
          <Select
            size="small"
            value={leftPeriod}
            onChange={(e) => setLeftPeriod(e.target.value as PeriodKey)}
            sx={{ ...selectSx, '& .MuiSelect-select': { ...selectSx['& .MuiSelect-select'], color: leftColor } }}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <MenuItem key={k} value={k} sx={{ fontSize: '0.72rem' }}>{PERIOD_LABELS[k]}</MenuItem>
            ))}
          </Select>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            vs
          </Typography>
          <Select
            size="small"
            value={rightPeriod}
            onChange={(e) => setRightPeriod(e.target.value as PeriodKey)}
            sx={{ ...selectSx, '& .MuiSelect-select': { ...selectSx['& .MuiSelect-select'], color: rightColor } }}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <MenuItem key={k} value={k} sx={{ fontSize: '0.72rem' }}>{PERIOD_LABELS[k]}</MenuItem>
            ))}
          </Select>
        </Stack>
      }
    >
      <svg ref={ref} width="100%" height={chartHeight} style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
