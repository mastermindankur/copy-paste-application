
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClipboardManager from '@/components/clipboard-manager';
import { Button } from '@/components/ui/button';
import { Loader2, Share, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { cn } from '@/lib/utils'; // Import cn utility

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionUrl, setNewCollectionUrl] = useState<string | null>(null);
  const [clientBaseUrl, setClientBaseUrl] = useState<string | undefined>(undefined);

  // Log the base URL available on the client side
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    // console.log('Client-side NEXT_PUBLIC_BASE_URL:', baseUrl); // Keep console logs minimal in production
    setClientBaseUrl(baseUrl);
  }, []);

  const handleCreateSharedCollection = async () => {
    setIsCreating(true);
    setNewCollectionUrl(null);
    try {
      const response = await fetch('/api/clip/create', {
        method: 'POST',
      });

      let responseBody: any = {};
      let responseText = '';

      try {
            responseText = await response.text();
            if (!responseText) {
                 throw new Error('Empty API response received.');
            }
            responseBody = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse API response as JSON:', parseError);
            console.error('Raw API Response Text (on parse error):', responseText);
            responseBody = { error: responseText || 'Failed to create shared collection. Invalid API response.' };
        }


      if (!response.ok) {
         console.error('API Error Response Body:', responseBody);
         const errorMessage = responseBody.error || 'Failed to create shared collection';
         const errorDetails = responseBody.details || 'No additional details provided.';
         // If the specific Redis error occurs, provide a more user-friendly message
         if (typeof errorDetails === 'string' && errorDetails.includes('Redis Client Error') || errorDetails.includes('Could not connect to Redis')) {
            throw new Error(`Failed to connect to the database. Please check server configuration. (Details: ${errorMessage})`);
         }
         throw new Error(`Failed to create clip collection (Details: ${errorDetails || errorMessage})`);
      }

      const { url, id } = responseBody;

      if (!url || !id) {
          throw new Error('Invalid response from server: Missing URL or ID.');
      }

      console.log(`Shared collection created. Received URL: ${url}`); // Log the URL received from API
      setNewCollectionUrl(url);
      toast({
          title: 'Shared Clipboard Ready!',
          description: 'A unique URL has been created. Copy and share it to sync items across devices.',
      });
      // Optional: redirect immediately:
      // router.push(url); // Use the received URL for redirection

    } catch (error) {
        console.error("Error creating shared collection:", error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast({
            title: 'Creation Failed',
            description: `Could not create shared clipboard: ${message}`,
            variant: 'destructive',
        });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyToClipboard = (url: string) => {
     // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      console.error('Clipboard API (writeText) not available.');
      toast({ title: 'Error', description: 'Cannot copy URL: Clipboard API not supported or unavailable.', variant: 'destructive' });
      return;
    }

     // Check for secure context (HTTPS), required by clipboard API except for localhost
    if (typeof window !== 'undefined' && !window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      console.warn('Clipboard API requires a secure context (HTTPS).');
      toast({ title: 'Warning', description: 'Copying to clipboard requires a secure connection (HTTPS).', variant: 'default' });
      // Optionally provide instructions to copy manually
      // Consider not proceeding or showing a manual copy prompt
    }


    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'URL Copied!', description: 'Share link copied to clipboard.' });
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      let description = 'Could not copy URL.';
       if (err instanceof DOMException) {
         if (err.name === 'NotAllowedError') {
           description = 'Clipboard write permission denied. Please grant permission or copy manually.';
         } else if (err.message.includes('Permissions Policy') || err.message.includes('permission policy')) { // Added explicit check for Permissions Policy error
           description = 'Clipboard access blocked by browser policy. Please copy manually.';
         } else if (err.message.includes('secure context')) {
           description = 'Copying to clipboard requires a secure connection (HTTPS).';
         }
       }
      toast({ title: 'Copy Failed', description: description, variant: 'destructive' });
    });
  };


  return (
    <TooltipProvider> {/* Wrap the relevant part or whole page with TooltipProvider */}
      <div className="flex flex-col items-center gap-8">
        {/* Header Section */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold mb-2">
            CrossClip
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your personal clipboard history. Add items locally or create a <span className="font-semibold">shared clipboard</span> to sync across devices via a unique URL.
          </p>
           {/* Display client-side base URL for debugging */}
           {/*
           {process.env.NODE_ENV === 'development' && clientBaseUrl && (
               <p className="text-xs mt-2 text-gray-500">(Debug: Client Base URL: {clientBaseUrl})</p>
           )}
           */}
        </div>

        {/* Shared Collection Section */}
          <Card className="w-full max-w-3xl shadow-md">
              <CardHeader>
                  <CardTitle>Shared Clipboard</CardTitle>
                  <CardDescription>
                      Click below to generate a unique, shareable URL. Anyone with the URL can view and add items to this clipboard for 7 days. Data is stored securely.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                   {newCollectionUrl ? (
                      <div className="space-y-3">
                          <p className="text-sm font-medium text-center text-green-700 dark:text-green-400">Your shared clipboard is ready!</p>
                          <div className="flex items-center gap-2">
                              <input
                                  type="text"
                                  value={newCollectionUrl}
                                  readOnly
                                  className="flex-grow p-2 border rounded-md bg-muted text-muted-foreground text-sm"
                                  aria-label="Shared Clipboard URL"
                                  onFocus={(e) => e.target.select()}
                              />
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleCopyToClipboard(newCollectionUrl)}
                                        aria-label="Copy Share URL" // More descriptive aria-label
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
                           <p className="text-xs text-muted-foreground text-center">Copy this URL and open it on other devices to sync.</p>
                          <Button
                             onClick={() => router.push(newCollectionUrl)}
                             className={cn(
                                "w-full",
                                newCollectionUrl && "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600" // Green background when URL exists
                             )}
                           >
                              Go to Shared Clipboard
                          </Button>
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground text-center">
                          No shared clipboard active. Create one to start syncing.
                      </p>
                  )}
              </CardContent>
              <CardFooter>
                   <Button
                      onClick={handleCreateSharedCollection}
                      disabled={isCreating}
                      className="w-full"
                      variant={newCollectionUrl ? "secondary" : "default"} // Change variant slightly if already created
                  >
                      {isCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Share className="mr-2 h-4 w-4" />
                      )}
                      {isCreating ? 'Creating Link...' : (newCollectionUrl ? 'Create Another Shared Link' : 'Create New Shared Clipboard Link')}
                  </Button>
              </CardFooter>
          </Card>


        {/* Local Clipboard Section */}
        <div className="w-full max-w-3xl mt-8">
           <Card className="shadow-md">
               <CardHeader>
                   <CardTitle>Local Clipboard</CardTitle>
                   <CardDescription>
                       Items added here are stored <span className="font-semibold">only in your current browser session</span> and are not shared or synced automatically. Use the "Shared Clipboard" feature above for cross-device syncing.
                   </CardDescription>
               </CardHeader>
               <CardContent>
                   {/* collectionId={null} indicates local mode */}
                   <ClipboardManager collectionId={null} />
               </CardContent>
           </Card>
        </div>

      </div>
     </TooltipProvider>
  );
}
