'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'super_admin' | 'cro' | 'product_analyst' | 'risk_analyst';

export interface UserProfile {
  id: string;
  displayName: string;
  role: UserRole | null;
  email: string | null;
}

interface UserContextValue {
  profile: UserProfile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  loading: true,
});

function parseSessionCookie(): UserProfile | null {
  try {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session='));
    if (!sessionCookie) return null;

    const token = sessionCookie.split('=')[1];
    // Decode JWT payload (base64url) — no verification needed client-side
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      id: payload.sub,
      displayName: payload.username,
      role: payload.role as UserRole,
      email: payload.email ?? null,
    };
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProfile(parseSessionCookie());
    setLoading(false);
  }, []);

  return (
    <UserContext.Provider value={{ profile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
