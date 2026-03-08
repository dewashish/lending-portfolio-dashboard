'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from './ChartContainer';
import { useCurrencyFormat, useCurrency } from '@/lib/currency-context';
import type { RAGStatus } from '@/lib/types';

const RAG_BAR_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

export interface SubsidiaryAUM {
  name: string;
  shortCode: string;
  subsidiaryId: number;
  aum: number;
  rag: RAGStatus;
}

interface Props {
  data: SubsidiaryAUM[];
  onBarClick?: (subsidiaryId: number) => void;
}

export function SubsidiaryAUMBar({ data, onBarClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { currency } = useCurrency();
  const { formatCurrency } = useCurrencyFormat();
  const sorted = [...data].sort((a, b) => b.aum - a.aum);

  const ref = useD3Chart((svg, width, height) => {
    const margin = { top: 10, right: 110, bottom: 20, left: 120 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(sorted.map(d => d.name))
      .range([0, h])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.aum) ?? 0])
      .range([0, w]);

    // Bars
    g.selectAll('.bar')
      .data(sorted)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.name)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.aum))
      .attr('fill', d => `${RAG_BAR_COLORS[d.rag]}40`)
      .attr('stroke', d => RAG_BAR_COLORS[d.rag])
      .attr('stroke-width', 1.5)
      .attr('rx', 4)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (_, d) => onBarClick?.(d.subsidiaryId))
      .on('mouseover', function () { d3.select(this).attr('opacity', 0.8); })
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); });

    // Value labels
    g.selectAll('.val')
      .data(sorted)
      .join('text')
      .attr('x', d => x(d.aum) + 6)
      .attr('y', d => y(d.name)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '11px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text(d => formatCurrency(d.aum));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', d3Tokens.text)
      .attr('font-size', '11px')
      .attr('font-weight', 600);

    g.selectAll('.domain, .tick line').remove();
  }, [sorted, d3Tokens, onBarClick, formatCurrency]);

  return (
    <ChartContainer title="Subsidiary AUM" subtitle={`Consumer + Trade (${currency})`} empty={!sorted.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
