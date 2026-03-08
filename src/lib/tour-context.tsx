'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useUser } from '@/lib/user-context';

interface TourContextValue {
  isTourRunning: boolean;
  startTour: () => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  isTourRunning: false,
  startTour: () => {},
  completeTour: () => {},
});

const TOUR_KEY_PREFIX = 'tour-completed-';

export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, loading } = useUser();
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading || !profile?.id || checked) return;
    const key = TOUR_KEY_PREFIX + profile.id;
    const completed = localStorage.getItem(key);
    if (!completed) {
      setChecked(true);
      const timer = setTimeout(() => setIsTourRunning(true), 800);
      return () => clearTimeout(timer);
    }
    setChecked(true);
  }, [profile, loading, checked]);

  const startTour = useCallback(() => {
    if (!profile?.id) return;
    localStorage.removeItem(TOUR_KEY_PREFIX + profile.id);
    setIsTourRunning(true);
  }, [profile]);

  const completeTour = useCallback(() => {
    if (!profile?.id) return;
    localStorage.setItem(TOUR_KEY_PREFIX + profile.id, new Date().toISOString());
    setIsTourRunning(false);
    setChecked(true);
  }, [profile]);

  return (
    <TourContext.Provider value={{ isTourRunning, startTour, completeTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}
