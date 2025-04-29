'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/provider';
import { Button } from '@/components/ui/button';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // auth might be null if init failed
import { LogIn, LogOut, ClipboardCopy, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'; // Import Tooltip components


export default function Header() {
  const { user, loading, initializationError } = useAuth(); // Get initializationError

  const handleSignIn = async () => {
    // Prevent sign-in if Firebase auth isn't available
    if (!auth || initializationError) {
        console.error("Sign-in blocked: Firebase Auth not available.");
        // Optionally show a toast message to the user
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // TODO: Show user-friendly error message via toast
    }
  };

  const handleSignOut = async () => {
     // Prevent sign-out if Firebase auth isn't available
     if (!auth || initializationError) {
        console.error("Sign-out blocked: Firebase Auth not available.");
        // Optionally show a toast message
        return;
     }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      // TODO: Show user-friendly error message via toast
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const isAuthDisabled = loading || !!initializationError; // Combine loading and error states


  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCopy className="h-6 w-6 text-accent" />
          {/* Ensure text color contrasts with card background */}
          <span className='text-card-foreground'>CrossClip</span>
        </Link>

         <div className="flex items-center gap-4">
             {/* Show Initialization Error Icon if present */}
             {initializationError && !initializationError.startsWith('Using placeholder') && (
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              {/* Use a span or div as trigger if button interaction is not needed */}
                              <span className="flex items-center justify-center h-10 w-10">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                                <span className="sr-only">Firebase Error</span>
                             </span>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p className="text-destructive">{initializationError}</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
             )}
            {/* Placeholder warning icon */}
            {initializationError?.startsWith('Using placeholder') && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-10 w-10">
                                <AlertCircle className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                                <span className="sr-only">Configuration Notice</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p className="text-orange-700 dark:text-orange-300 max-w-xs">{initializationError}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}


          {/* Auth Section */}
          {loading ? (
             <Skeleton className="h-10 w-20 rounded-md" /> // Improved skeleton shape
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={isAuthDisabled}>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" disabled={isAuthDisabled}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} disabled={isAuthDisabled}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleSignIn} variant="outline" disabled={isAuthDisabled} aria-disabled={isAuthDisabled}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

