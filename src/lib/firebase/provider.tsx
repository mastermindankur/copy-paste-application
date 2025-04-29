'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const queryClient = new QueryClient();


export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      <QueryClientProvider client={queryClient}>
            {children}
      </QueryClientProvider>
    </FirebaseContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
}
