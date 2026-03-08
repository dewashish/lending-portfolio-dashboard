'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AdminContextValue {
  isAdmin: boolean;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  unlock: async () => false,
  lock: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => setIsAdmin(false), []);

  return (
    <AdminContext.Provider value={{ isAdmin, unlock, lock }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
