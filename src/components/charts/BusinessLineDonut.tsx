'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatCurrency } from '@/lib/format';

const SEGMENT_COLORS: Record<string, string> = {
  Consumer: '#00897b',
  Trade: '#42a5f5',
  Corporate: '#ff6f00',
};

interface Props {
  consumer: number;
  trade: number;
  corporate: number;
  onSegmentClick?: (segment: 'consumer' | 'trade' | 'corporate') => void;
}

export function BusinessLineDonut({ consumer, trade, corporate, onSegmentClick }: Props) {
  const { d3Tokens } = useThemeMode();

  const pieData = [
    { label: 'Consumer', value: consumer, key: 'consumer' as const },
    { label: 'Trade', value: trade, key: 'trade' as const },
    { label: 'Corporate', value: corporate, key: 'corporate' as const },
  ].filter(d => d.value > 0);

  const total = consumer + trade + corporate;

  const ref = useD3Chart(
    (svg, width, height) => {
      const radius = Math.min(width, height) / 2 - 10;
      const innerRadius = radius * 0.55;

      const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

      const pie = d3.pie<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>()
        .value(d => d.value)
        .sort(null);

      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3)
        .padAngle(0.02);

      const arcs = g.selectAll('.arc')
        .data(pie(pieData))
        .join('g')
        .attr('class', 'arc');

      arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => SEGMENT_COLORS[d.data.label])
        .attr('opacity', 0.9)
        .style('cursor', onSegmentClick ? 'pointer' : 'default')
        .on('click', (_, d) => onSegmentClick?.(d.data.key))
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Slice labels
      const labelArc = d3.arc<d3.PieArcDatum<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>>()
        .innerRadius(radius * 0.78)
        .outerRadius(radius * 0.78);

      arcs.append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('font-weight', 600)
        .attr('pointer-events', 'none')
        .text(d => {
          const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0';
          return `${d.data.label.slice(0, 4)} ${pct}%`;
        });

      // Center text
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '12px')
        .attr('font-weight', 700)
        .text('Group AUM');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '14px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(formatCurrency(total));

      // Legend
      const legend = svg.append('g').attr('transform', `translate(${width - 95},${12})`);
      pieData.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 18})`);
        row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', SEGMENT_COLORS[d.label]);
        row.append('text').attr('x', 14).attr('y', 9).attr('fill', d3Tokens.textMuted).attr('font-size', '10px').text(d.label);
      });
    },
    [pieData, total, d3Tokens, onSegmentClick],
  );

  return (
    <ChartContainer title="Business Line Split" subtitle="AUM by portfolio type" empty={total === 0}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
