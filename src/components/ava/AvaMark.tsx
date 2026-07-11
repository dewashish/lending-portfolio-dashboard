'use client';

import { AVA_TEAL, AVA_IRIS } from '@/lib/ava/brand';

interface Props {
  size?: number;
  /** Renders in a single flat color instead of the brand gradient (e.g. on gradient backgrounds). */
  color?: string;
}

/**
 * The AVA mark: a large four-point spark with a small companion spark —
 * the analyst's "aha" moment. Gradient runs teal → iris (data → insight).
 */
export function AvaMark({ size = 18, color }: Props) {
  const gradId = `ava-grad-${size}`;
  const fill = color ?? `url(#${gradId})`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="AVA">
      {!color && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={AVA_TEAL} />
            <stop offset="100%" stopColor={AVA_IRIS} />
          </linearGradient>
        </defs>
      )}
      {/* main spark — pinched four-point star */}
      <path
        d="M10 2.5c.9 3.9 1.8 5.6 3 6.8 1.2 1.2 2.9 2.1 6.8 3-3.9.9-5.6 1.8-6.8 3-1.2 1.2-2.1 2.9-3 6.8-.9-3.9-1.8-5.6-3-6.8-1.2-1.2-2.9-2.1-6.8-3 3.9-.9 5.6-1.8 6.8-3 1.2-1.2 2.1-2.9 3-6.8Z"
        fill={fill}
      />
      {/* companion spark */}
      <path
        d="M19 2c.35 1.5.7 2.15 1.15 2.6.45.45 1.1.8 2.6 1.15-1.5.35-2.15.7-2.6 1.15C19.7 7.35 19.35 8 19 9.5c-.35-1.5-.7-2.15-1.15-2.6-.45-.45-1.1-.8-2.6-1.15 1.5-.35 2.15-.7 2.6-1.15C18.3 4.15 18.65 3.5 19 2Z"
        fill={fill}
        opacity={0.8}
      />
    </svg>
  );
}
