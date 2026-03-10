'use client';

import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';

export function SessionHeartbeat() {
  useSessionHeartbeat();
  return null;
}
