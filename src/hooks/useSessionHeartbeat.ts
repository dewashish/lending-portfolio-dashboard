'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/lib/user-context';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSessionHeartbeat() {
  const { profile } = useUser();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!profile) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/heartbeat', { method: 'POST' });
      } catch {
        // Silently ignore heartbeat failures
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Then every 5 minutes
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [profile]);
}
