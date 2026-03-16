'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent, formatNumber } from '@/lib/format';
import { Typography } from '@mui/material';
import type { CorporateIndustryConcentrationRow } from '@/lib/types';

interface Props {
  data: CorporateIndustryConcentrationRow[];
  period: string;
  valueField: 'disbursement' | 'pos' | 'sanctioned';
}

export function SectorBreakdownChart({ data, period, valueField }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();

  const filtered = useMemo(() => {
    const periodData = data.filter((d) => d.period === period);
    return periodData
      .sort((a, b) => b[valueField] - a[valueField])
      .slice(0, 10);
  }, [data, period, valueField]);

  const title =
    valueField === 'disbursement'
      ? 'Sector Breakdown — Disbursement'
      : 'Sector Breakdown — POS';

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any stale tooltips
      d3.selectAll('.sector-breakdown-tooltip').remove();

      const margin = { top: 10, right: 90, bottom: 20, left: 140 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const color = d3.scaleOrdinal(d3.schemeTableau10);

      // Y axis: sector names
      const y = d3
        .scaleBand()
        .domain(filtered.map((d) => d.sector))
        .range([0, h])
        .padding(0.25);

      // X axis: values
      const maxVal = d3.max(filtered, (d) => d[valueField]) ?? 0;
      const x = d3.scaleLinear().domain([0, maxVal * 1.15]).nice().range([0, w]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickSize(h)
            .tickFormat(() => ''),
        )
        .selectAll('.tick line')
        .attr('stroke', d3Tokens.gridLine);
      g.selectAll('.domain').remove();

      // Tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'sector-breakdown-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '12px 16px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.5');

      // Horizontal bars
      g.selectAll('.bar')
        .data(filtered)
        .join('rect')
        .attr('class', 'bar')
        .attr('y', (d) => y(d.sector)!)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => x(d[valueField]))
        .attr('fill', (_, i) => color(String(i)))
        .attr('rx', 4)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function (event: MouseEvent, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);

          const irrDisplay = d.irr != null ? formatPercent(d.irr) : '—';
          const html = `
            <div style="font-weight:700;margin-bottom:6px;font-size:13px">${d.sector}</div>
            <table style="border-collapse:collapse;width:100%">
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">Amount</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatCurrencyMM(d[valueField])}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">Portfolio Share</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatPercent(d.portfolioShare)}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">IRR</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${irrDisplay}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">Facilities</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatNumber(d.facilityCount)}</td>
              </tr>
            </table>
          `;

          tooltip.html(html).style('opacity', '1');

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
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // Value labels at right end of bars
      g.selectAll('.val')
        .data(filtered)
        .join('text')
        .attr('class', 'val')
        .attr('x', (d) => x(d[valueField]) + 6)
        .attr('y', (d) => y(d.sector)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrencyMM(d[valueField]));

      // Y axis: sector labels
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .each(function () {
          const el = d3.select(this);
          const text = el.text();
          if (text.length > 18) {
            el.text(text.slice(0, 17) + '\u2026');
          }
        });

      g.selectAll('.domain, .tick line').remove();
    },
    [filtered, d3Tokens, formatCurrencyMM, valueField],
  );

  return (
    <ChartContainer
      title={title}
      height={320}
      empty={!filtered.length}
      headerRight={
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
          }}
        >
          {period}
        </Typography>
      }
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
