'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseInitializationError } from './config'; // Import auth and the error status
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  initializationError: string | null; // Add error state to context
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const queryClient = new QueryClient();

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start loading true. If there's an initialization error, loading will stay true unless explicitly handled.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only attempt to set up auth listener if Firebase initialized correctly and auth exists
    if (!firebaseInitializationError && auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); // Set loading false only after auth state is determined
      }, (error) => {
          // Handle potential errors during auth state listening itself
          console.error("Auth state change error:", error);
          setUser(null); // Assume no user on error
          setLoading(false); // Finish loading state even if there's an error here
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } else {
      // If Firebase didn't initialize, set loading to false immediately
      // because the auth state will never resolve.
      setLoading(false);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Memoize the user object to prevent unnecessary reference changes
  const memoizedUser = useMemo(() => user, [user]);

  // Memoize the context value itself, including the error status
  const contextValue = useMemo(() => ({
      user: memoizedUser,
      loading,
      initializationError: firebaseInitializationError // Pass error state
  }), [memoizedUser, loading]);

   // If there was an initialization error, show an error message instead of the app content
   if (firebaseInitializationError && !firebaseInitializationError.startsWith('Using placeholder')) {
     return (
       <div className="flex items-center justify-center min-h-screen p-4">
          <Alert variant="destructive" className="max-w-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Firebase Initialization Error</AlertTitle>
              <AlertDescription>
                  {firebaseInitializationError}
                  <br />
                  Please ensure your <code>.env</code> file is correctly configured with your Firebase project credentials. The application cannot function correctly without Firebase.
              </AlertDescription>
          </Alert>
       </div>
     );
   }


  return (
    <FirebaseContext.Provider value={contextValue}>
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
  // Return the full context including the error state
  return context;
}
