'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export function useD3Chart(
  renderFn: (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
  ) => void,
  deps: unknown[],
) {
  const ref = useRef<SVGSVGElement>(null);
  const renderFnRef = useRef(renderFn);
  renderFnRef.current = renderFn;

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderFnRef.current(svg, rect.width, rect.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!ref.current) return;
    const parent = ref.current.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      if (!ref.current) return;
      const svg = d3.select(ref.current);
      svg.selectAll('*').remove();
      const rect = ref.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      renderFnRef.current(svg, rect.width, rect.height);
    });

    observer.observe(parent);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
