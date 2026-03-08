'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { formatCurrencyBase } from './format';

type CurrencyCode = 'USD' | 'AED';

interface CurrencyContextValue {
  currency: CurrencyCode;
  toggleCurrency: () => void;
}

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; rate: number }> = {
  USD: { symbol: '$', rate: 1 },
  AED: { symbol: 'AED ', rate: 3.6725 },
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  toggleCurrency: () => {},
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function useCurrencyFormat() {
  const { currency } = useCurrency();
  const { symbol, rate } = CURRENCY_CONFIG[currency];

  const formatCurrency = useCallback(
    (value: number | null | undefined, decimals = 1) =>
      formatCurrencyBase(value, decimals, symbol, rate),
    [symbol, rate],
  );

  const formatCurrencyMM = useCallback(
    (value: number | null | undefined, decimals = 2) =>
      formatCurrencyBase(value, decimals, symbol, rate),
    [symbol, rate],
  );

  return { formatCurrency, formatCurrencyMM };
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  useEffect(() => {
    const stored = localStorage.getItem('currency-preference') as CurrencyCode | null;
    if (stored === 'USD' || stored === 'AED') {
      setCurrency(stored);
    }
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === 'USD' ? 'AED' : 'USD';
      localStorage.setItem('currency-preference', next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ currency, toggleCurrency }), [currency, toggleCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
