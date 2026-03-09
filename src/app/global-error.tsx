'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>{error.message}</p>
          <button onClick={reset} style={{ padding: '8px 24px', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
