'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import type { FXRiskRow, CountryRiskRow, EWSEntitySummary, RAGStatus } from '@/lib/types';

interface Props {
  fxData: FXRiskRow[];
  countryData: CountryRiskRow[];
  ewsData: EWSEntitySummary[];
}

const RAG_CELL_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

const RISK_DIMENSIONS = ['FX Risk', 'Country Risk', 'EWS Alert'] as const;

interface RiskCell {
  entity: string;
  dimension: string;
  rag: RAGStatus;
}

const ROW_H = 52;
const MIN_CELL_W = 100;
const MARGIN = { top: 40, right: 20, bottom: 20, left: 160 };

export function CompositeRiskHeatmap({ fxData, countryData, ewsData }: Props) {
  const { d3Tokens } = useThemeMode();

  const { cells, entities } = useMemo(() => {
    // Collect all unique entities
    const entitySet = new Set<string>();
    fxData.forEach((r) => entitySet.add(r.entity));
    countryData.forEach((r) => entitySet.add(r.entity));
    ewsData.forEach((r) => entitySet.add(r.entity));
    const entityList = Array.from(entitySet).sort();

    // Build lookup maps
    const fxMap = new Map<string, RAGStatus>();
    fxData.forEach((r) => fxMap.set(r.entity, r.rag));

    const countryMap = new Map<string, RAGStatus>();
    countryData.forEach((r) => countryMap.set(r.entity, r.rag));

    const ewsMap = new Map<string, RAGStatus>();
    ewsData.forEach((r) => ewsMap.set(r.entity, r.rag));

    const cellList: RiskCell[] = [];
    entityList.forEach((entity) => {
      cellList.push({ entity, dimension: 'FX Risk', rag: fxMap.get(entity) ?? 'Green' });
      cellList.push({ entity, dimension: 'Country Risk', rag: countryMap.get(entity) ?? 'Green' });
      cellList.push({ entity, dimension: 'EWS Alert', rag: ewsMap.get(entity) ?? 'Green' });
    });

    return { cells: cellList, entities: entityList };
  }, [fxData, countryData, ewsData]);

  const chartHeight = Math.max(320, entities.length * ROW_H + MARGIN.top + MARGIN.bottom);
  const chartMinWidth = RISK_DIMENSIONS.length * MIN_CELL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain([...RISK_DIMENSIONS]).range([0, w]).padding(0.1);
      const y = d3.scaleBand<string>().domain(entities).range([0, h]).padding(0.1);

      // Draw cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.dimension)!)
        .attr('y', (d) => y(d.entity)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => RAG_CELL_COLORS[d.rag])
        .attr('rx', 4)
        .attr('opacity', 0.85)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        });

      // RAG label inside cells
      g.selectAll('text.rag-label')
        .data(cells)
        .join('text')
        .attr('class', 'rag-label')
        .attr('x', (d) => x(d.dimension)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.entity)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', Math.min(14, x.bandwidth() * 0.18) + 'px')
        .attr('font-weight', '700')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => d.rag);

      // X axis (Risk Dimensions) - top
      g.append('g')
        .attr('transform', `translate(0,${-6})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // Y axis (Entity names)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();
    },
    [cells, entities, d3Tokens],
  );

  return (
    <ChartContainer title="Composite Risk Heatmap" subtitle="Subsidiaries vs. risk dimensions" height={chartHeight} empty={!cells.length}>
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
