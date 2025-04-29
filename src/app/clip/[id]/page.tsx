
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use App Router hooks
import ClipboardManager from '@/components/clipboard-manager';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { SharedClipCollection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

export default function SharedClipPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params.id as string; // Get ID from URL

  const [isLoading, setIsLoading] = useState(true);
  const [collectionData, setCollectionData] = useState<SharedClipCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const collectionUrl = typeof window !== 'undefined' ? window.location.href : '';


  const fetchCollection = async () => {
      if (!collectionId) return;
      setIsRefreshing(true); // Indicate refresh start
      setError(null);
      try {
        const response = await fetch(`/api/clip/${collectionId}`);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
             throw new Error(errorData.error || `Failed to fetch collection (Status: ${response.status})`);
        }
        const data: SharedClipCollection = await response.json();
        // Ensure items are sorted by date, newest first (API should ideally handle this)
        data.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCollectionData(data);
      } catch (fetchError) {
         console.error("Error fetching collection:", fetchError);
         const message = fetchError instanceof Error ? fetchError.message : 'An unexpected error occurred.';
         setError(message);
         toast({ title: 'Error Loading Collection', description: `Could not load shared clipboard: ${message}`, variant: 'destructive' });
         setCollectionData(null); // Clear potentially stale data
      } finally {
        setIsLoading(false);
        setIsRefreshing(false); // Indicate refresh end
      }
    };


  useEffect(() => {
    if (collectionId) {
      fetchCollection();
    } else {
        // Handle case where ID might be missing briefly during render
        setIsLoading(false);
        setError("Collection ID not found in URL.");
    }
    // Intentionally empty dependency array to run only once on mount,
    // manual refresh is provided. Add collectionId if needed but be mindful of loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);


 const handleCopyToClipboard = (url: string) => {
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      console.error('Clipboard API (writeText) not available.');
      toast({ title: 'Error', description: 'Cannot copy URL: Clipboard API not supported.', variant: 'destructive' });
      return;
    }

    // Check for secure context (HTTPS), required by clipboard API except for localhost
    if (typeof window !== 'undefined' && !window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      console.warn('Clipboard API requires a secure context (HTTPS).');
      toast({ title: 'Secure Connection Required', description: 'Copying to clipboard requires a secure connection (HTTPS).', variant: 'default' });
      // Optionally provide instructions to copy manually
      // Consider not proceeding or showing a manual copy prompt
    }

    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'URL Copied!', description: 'Share link copied to your clipboard.' });
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      let description = 'Could not copy URL.';
      // Try to provide more specific feedback based on the error
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          description = 'Clipboard write permission denied. Please grant permission in your browser or copy manually.';
        } else if (err.message.includes('Permissions Policy') || err.message.includes('permission policy')) { // Added second check
          description = 'Clipboard access blocked by browser policy. Please copy manually.';
        } else if (err.message.includes('secure context')) {
          description = 'Copying to clipboard requires a secure connection (HTTPS).';
        }
      }
      toast({ title: 'Copy Failed', description: description, variant: 'destructive' });
    });
  };

  if (isLoading) {
    return (
     <TooltipProvider>
      <div className="flex flex-col items-center gap-8">
         {/* Skeleton Header */}
         <div className="text-center mb-6 w-full max-w-3xl">
           <div className="flex justify-between items-center mb-2">
             <Skeleton className="h-8 w-24" /> {/* Back button */}
             <Skeleton className="h-8 w-48" /> {/* Title */}
             <Skeleton className="h-8 w-28" /> {/* Refresh button */}
           </div>
            <Skeleton className="h-4 w-3/4 mx-auto mb-4" /> {/* Description */}
            {/* URL Input Skeleton */}
            <div className="mt-4 flex items-center gap-2 justify-center">
              <Skeleton className="h-10 flex-grow max-w-md" />
              <Skeleton className="h-10 w-10" /> {/* Copy button */}
            </div>
         </div>

         {/* Skeleton Clipboard Manager */}
         <div className="w-full max-w-3xl space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" /> {/* Placeholder for add area */}
            <Skeleton className="h-8 w-32 mb-4" /> {/* Placeholder for history title */}
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <p className='text-center text-muted-foreground py-4'>Loading shared clipboard...</p>
      </div>
     </TooltipProvider>
    );
  }

  if (error) {
    return (
      <TooltipProvider>
      <div className="flex flex-col items-center gap-4 text-center p-6 border border-destructive/30 rounded-lg bg-destructive/5 max-w-xl mx-auto">
         <AlertTriangle className="h-10 w-10 text-destructive" />
        <h1 className="text-2xl font-semibold text-destructive">Error Loading Clipboard</h1>
        <p className="text-muted-foreground">{error}</p>
        <div className="flex gap-4 mt-4">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={() => router.push('/')} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back Home
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Return to the main page</p>
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                 <TooltipTrigger asChild>
                     <Button onClick={fetchCollection} disabled={isRefreshing} variant="secondary">
                          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          {isRefreshing ? 'Retrying...' : 'Retry Loading'}
                      </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Attempt to load the clipboard again</p>
                 </TooltipContent>
             </Tooltip>
        </div>
      </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex flex-col items-center gap-8">
      {/* Header for Shared Collection */}
      <div className="text-center mb-6 w-full max-w-3xl">
         <div className="flex justify-between items-center mb-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={() => router.push('/')} variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Return to the main page</p>
                 </TooltipContent>
             </Tooltip>
             <h1 className="text-2xl font-semibold">
                Shared Clipboard
             </h1>
              <Tooltip>
                  <TooltipTrigger asChild>
                     <Button onClick={fetchCollection} variant="outline" size="sm" disabled={isRefreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>Reload the items in this shared clipboard</p>
                   </TooltipContent>
               </Tooltip>
         </div>

        <p className="text-sm text-muted-foreground">
          Items added here are synced across all devices using this URL. Keep this URL handy!
        </p>
         <div className="mt-4 flex items-center gap-2 justify-center">
             <input
                type="text"
                value={collectionUrl}
                readOnly
                className="flex-grow max-w-md p-2 border rounded-md bg-muted text-muted-foreground text-sm"
                aria-label="Shared Clipboard URL"
                onFocus={(e) => e.target.select()} // Select all text on focus
             />
            <Tooltip>
                 <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon" // Make icon only for consistency
                        className="h-9 w-9" // Adjust size if needed
                        onClick={() => handleCopyToClipboard(collectionUrl)}
                    >
                        <Copy className="h-4 w-4" />
                         <span className="sr-only">Copy Share URL</span>
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy Share URL</p>
                  </TooltipContent>
               </Tooltip>
         </div>
      </div>

      {/* Clipboard Manager for the specific collection */}
      <div className="w-full max-w-3xl">
        {collectionId ? (
          // Pass the collection ID and potentially fetched items
          <ClipboardManager collectionId={collectionId} initialItems={collectionData?.items} />
        ) : (
           // Should not happen if loading/error states are handled, but good fallback
           <p className='text-destructive text-center'>Error: Invalid Collection ID found.</p>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
