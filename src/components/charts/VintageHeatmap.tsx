'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Collapse, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useAva } from '@/components/ava/AvaProvider';
import { AvaMark } from '@/components/ava/AvaMark';
import { AVA_GRADIENT, AVA_SELECTION } from '@/lib/ava/brand';
import type { AvaContext } from '@/lib/ava/types';
import type { VintagePoint } from '@/lib/types';

interface Props {
  data: VintagePoint[];
  metricType: string;
  fillHeight?: boolean;
}

const ROW_H = 28;
const MIN_CELL_W = 48;
const LA_COL_W = 60;
const MARGIN = { top: 24, right: 16, bottom: 36, left: 72 };
const MOB_CAP = 18;
const MOB_OVERFLOW = MOB_CAP + 1; // 19 = internal value representing "18+"
const TOOLTIP_CLASS = 'vintage-heatmap-tooltip';

interface CellDatum {
  vintage: string;
  mob: number;
  rate: number;
  loanAmount: number;
}

export function VintageHeatmap({ data, metricType, fillHeight }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();
  const { openAsk } = useAva();

  // Cells the user has picked for AVA, keyed `${vintage}|${mob}`.
  const [selected, setSelected] = useState<Map<string, CellDatum>>(new Map());

  // Metric/filter change invalidates the selection.
  useEffect(() => {
    setSelected(new Map());
  }, [metricType, data]);

  const filtered = useMemo(
    () => data.filter((d) => d.metricType === metricType),
    [data, metricType],
  );

  const { vintages, mobs, maxRate, cellMap, vintageLoanMap } = useMemo(() => {
    // Sort vintages chronologically
    const vintageSet = Array.from(new Set(filtered.map((d) => d.vintage)));
    const sorted = vintageSet.sort((a, b) => {
      const parseV = (s: string) => {
        const months: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const match = s.match(/([A-Za-z]+)'?(\d{2,4})/);
        if (!match) return 0;
        const m = months[match[1]] ?? 0;
        let y = parseInt(match[2], 10);
        if (y < 100) y += 2000;
        return y * 12 + m;
      };
      return parseV(a) - parseV(b);
    });

    // Group MOBs > 18 into a single "18+" bucket (mob = 19 internally)
    // Use weighted average by loan amount for the grouped bucket
    const grouped = new Map<string, { weightedSum: number; totalWeight: number }>();
    filtered.forEach((d) => {
      const mob = d.mob > MOB_CAP ? MOB_OVERFLOW : d.mob;
      const key = `${d.vintage}|${mob}`;
      const g = grouped.get(key);
      if (g) {
        g.weightedSum += d.delinquencyRate * d.loanAmount;
        g.totalWeight += d.loanAmount;
      } else {
        grouped.set(key, { weightedSum: d.delinquencyRate * d.loanAmount, totalWeight: d.loanAmount });
      }
    });

    // Build cellMap with grouped data
    const map = new Map<string, CellDatum>();
    grouped.forEach((val, key) => {
      const [vintage, mobStr] = key.split('|');
      const mob = parseInt(mobStr);
      const rate = val.totalWeight > 0 ? val.weightedSum / val.totalWeight : 0;
      map.set(key, { vintage, mob, rate, loanAmount: val.totalWeight });
    });

    // Collect MOBs that exist in the data (after grouping)
    const mobSet = new Set<number>();
    map.forEach((d) => mobSet.add(d.mob));
    const mobArr = Array.from(mobSet).sort((a, b) => a - b);

    // Max rate for color scale
    let max = 0;
    map.forEach((d) => { if (d.rate > max) max = d.rate; });
    if (max === 0) max = 0.1;

    // Loan amount per vintage (from MOB 1)
    const laMap = new Map<string, number>();
    filtered.forEach((d) => {
      if (d.mob === 1) {
        const existing = laMap.get(d.vintage) ?? 0;
        laMap.set(d.vintage, existing + d.loanAmount);
      }
    });

    return { vintages: sorted, mobs: mobArr, maxRate: max, cellMap: map, vintageLoanMap: laMap };
  }, [filtered]);

  const chartHeight = Math.max(300, vintages.length * ROW_H + MARGIN.top + MARGIN.bottom);
  const chartMinWidth = mobs.length * MIN_CELL_W + LA_COL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any previous tooltip
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = MARGIN;
      const w = width - margin.left - margin.right - LA_COL_W;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand<number>()
        .domain(mobs)
        .range([LA_COL_W, LA_COL_W + w])
        .padding(0.04);

      const y = d3
        .scaleBand<string>()
        .domain(vintages)
        .range([0, h])
        .padding(0.04);

      // Color: green (low) → yellow → red (high)
      const colorScale = d3
        .scaleSequential(d3.interpolateRdYlGn)
        .domain([maxRate, 0]);

      // ── Tooltip ──────────────────────────────────────────────────────
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

      function showTooltip(event: MouseEvent, d: CellDatum) {
        const mobLabel = d.mob === MOB_OVERFLOW ? '18+' : `${d.mob}`;
        const la = vintageLoanMap.get(d.vintage) ?? 0;
        const absAmt = d.rate * la;

        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.vintage} — MOB ${mobLabel}</div>` +
          `<div><span style="color:${mutedColor}">${metricType} Rate:</span> <b>${formatPercent(d.rate, 2)}</b></div>` +
          `<div><span style="color:${mutedColor}">Delinquent Amt:</span> <b>${formatCurrency(absAmt)}</b></div>` +
          `<div><span style="color:${mutedColor}">Loan Amount:</span> <b>${formatCurrency(la)}</b></div>`
        ).style('opacity', '1');

        positionTooltip(event);
      }

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

      // ── LA column header ────────────────────────────────────────────
      g.append('text')
        .attr('x', LA_COL_W / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px')
        .attr('font-weight', 600)
        .text('Loan Amt');

      // ── LA values per vintage ───────────────────────────────────────
      vintages.forEach((v) => {
        const la = vintageLoanMap.get(v);
        g.append('rect')
          .attr('x', 2)
          .attr('y', y(v)!)
          .attr('width', LA_COL_W - 6)
          .attr('height', y.bandwidth())
          .attr('fill', 'rgba(128,128,128,0.08)')
          .attr('rx', 2);
        g.append('text')
          .attr('x', LA_COL_W / 2)
          .attr('y', y(v)! + y.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '9px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(la != null ? formatCurrency(la) : '—');
      });

      // ── Build cell data from grouped cellMap ────────────────────────
      const cells: CellDatum[] = [];
      vintages.forEach((v) => {
        mobs.forEach((m) => {
          const d = cellMap.get(`${v}|${m}`);
          if (d) cells.push(d);
        });
      });

      // ── Render heatmap cells ────────────────────────────────────────
      const isSelected = (d: CellDatum) => selected.has(`${d.vintage}|${d.mob}`);

      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.mob)!)
        .attr('y', (d) => y(d.vintage)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.rate))
        .attr('rx', 2)
        .attr('cursor', 'pointer')
        .attr('opacity', (d) => (isSelected(d) ? 1 : 0.92))
        .attr('stroke', (d) => (isSelected(d) ? AVA_SELECTION : 'none'))
        .attr('stroke-width', (d) => (isSelected(d) ? 2.5 : 0))
        .on('mouseover', function (_event, d) {
          if (!isSelected(d)) {
            d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          }
          showTooltip(_event as unknown as MouseEvent, d);
        })
        .on('mousemove', function (_event) {
          positionTooltip(_event as unknown as MouseEvent);
        })
        .on('mouseout', function (_event, d) {
          if (isSelected(d)) {
            d3.select(this).attr('opacity', 1).attr('stroke', AVA_SELECTION).attr('stroke-width', 2.5);
          } else {
            d3.select(this).attr('opacity', 0.92).attr('stroke', 'none');
          }
          tooltip.style('opacity', '0');
        })
        .on('click', function (_event, d) {
          tooltip.style('opacity', '0');
          setSelected((prev) => {
            const next = new Map(prev);
            const key = `${d.vintage}|${d.mob}`;
            if (next.has(key)) next.delete(key);
            else next.set(key, d);
            return next;
          });
        });

      // ── Rate labels inside cells ────────────────────────────────────
      g.selectAll('text.cell-label')
        .data(cells)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.mob)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.vintage)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.rate > maxRate * 0.6 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(10, x.bandwidth() * 0.4) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 32 || y.bandwidth() < 14) return '';
          return formatPercent(d.rate, 1);
        });

      // ── Y axis (vintage labels) ────────────────────────────────────
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '9px');

      g.selectAll('.domain').remove();

      // ── X axis (MOB numbers) ───────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(
          d3.axisBottom(x)
            .tickSize(0)
            .tickFormat((d) => (d === MOB_OVERFLOW ? '18+' : `${d}`)),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px');

      g.selectAll('.domain').remove();

      // ── X axis label ───────────────────────────────────────────────
      g.append('text')
        .attr('x', LA_COL_W + w / 2)
        .attr('y', h + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px')
        .text('Months on Book (MOB)');
    },
    [filtered, vintages, mobs, maxRate, cellMap, vintageLoanMap, d3Tokens, formatCurrency, metricType, selected],
  );

  // \u2500\u2500 AVA context \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const selectedCells = Array.from(selected.values()).sort(
    (a, b) => a.vintage.localeCompare(b.vintage) || a.mob - b.mob,
  );
  const mobLabel = (m: number) => (m === MOB_OVERFLOW ? '18+' : `${m}`);

  const sectionAva: AvaContext = {
    insightId: 'consumer.delinquency.staticPool',
    breadcrumb: ['Consumer', 'Delinquency', `Static Pool \u2014 ${metricType}`],
    params: { metric: metricType },
  };

  const selectionAva: AvaContext = {
    ...sectionAva,
    selection: selectedCells.map(
      (c) => `${c.vintage} \u00b7 MOB ${mobLabel(c.mob)} \u00b7 ${formatPercent(c.rate, 1)}`,
    ),
    params: {
      metric: metricType,
      vintages: Array.from(new Set(selectedCells.map((c) => c.vintage))),
      mobs: selectedCells.map((c) => mobLabel(c.mob)),
    },
  };

  return (
    <ChartContainer
      title={`Static Pool \u2014 ${metricType}`}
      subtitle={"Delinquency rate by vintage cohort and MOB \u00b7 Click cells to ask AVA about them"}
      height={chartHeight}
      empty={!filtered.length}
      fillHeight={fillHeight}
      ava={sectionAva}
    >
      {/* Selection bar \u2014 appears when cells are picked */}
      <Collapse in={selected.size > 0}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{
            mb: 1,
            px: 1.25,
            py: 0.75,
            borderRadius: 2,
            border: `1px solid ${AVA_SELECTION}55`,
            bgcolor: `${AVA_SELECTION}0d`,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.66rem' }}>
            {selected.size} cell{selected.size === 1 ? '' : 's'} selected
          </Typography>
          {selectedCells.slice(0, 4).map((c) => (
            <Chip
              key={`${c.vintage}|${c.mob}`}
              size="small"
              label={`${c.vintage} \u00b7 M${mobLabel(c.mob)} \u00b7 ${formatPercent(c.rate, 1)}`}
              onDelete={() =>
                setSelected((prev) => {
                  const next = new Map(prev);
                  next.delete(`${c.vintage}|${c.mob}`);
                  return next;
                })
              }
              sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }}
            />
          ))}
          {selectedCells.length > 4 && (
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
              +{selectedCells.length - 4} more
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<AvaMark size={13} color="#fff" />}
            onClick={(e) => openAsk(selectionAva, { el: e.currentTarget })}
            sx={{
              height: 26,
              px: 1.25,
              fontSize: '0.66rem',
              fontWeight: 700,
              textTransform: 'none',
              color: '#fff',
              background: AVA_GRADIENT,
              '&:hover': { background: AVA_GRADIENT, opacity: 0.9 },
            }}
          >
            Ask AVA
          </Button>
          <Button
            size="small"
            startIcon={<CloseRoundedIcon sx={{ fontSize: 12 }} />}
            onClick={() => setSelected(new Map())}
            sx={{ height: 26, px: 1, fontSize: '0.64rem', textTransform: 'none', color: 'text.secondary' }}
          >
            Clear
          </Button>
        </Stack>
      </Collapse>

      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
