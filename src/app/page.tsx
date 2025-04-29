
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClipboardManager from '@/components/clipboard-manager';
import { Button } from '@/components/ui/button';
import { Loader2, Share, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionUrl, setNewCollectionUrl] = useState<string | null>(null);
  const [clientBaseUrl, setClientBaseUrl] = useState<string | undefined>(undefined);

  // Log the base URL available on the client side
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    console.log('Client-side NEXT_PUBLIC_BASE_URL:', baseUrl);
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
         throw new Error(`Failed to create clip collection (Details: ${errorDetails || errorMessage})`);
      }

      const { url, id } = responseBody;

      if (!url || !id) {
          throw new Error('Invalid response from server: Missing URL or ID.');
      }

      console.log(`Shared collection created. Received URL: ${url}`); // Log the URL received from API
      setNewCollectionUrl(url);
      toast({
          title: 'Shared Clipboard Created!',
          description: 'You can now share this URL.',
      });
      // Optional: redirect immediately:
      // router.push(url); // Use the received URL for redirection

    } catch (error) {
        console.error("Error creating shared collection:", error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
        });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'URL Copied!', description: 'Link copied to clipboard.' });
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      toast({ title: 'Error', description: 'Could not copy URL.', variant: 'destructive' });
    });
  };


  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-semibold mb-2">
          CrossClip
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your personal clipboard history. Add items locally or create a shared clipboard to sync across devices via a unique URL.
        </p>
         {/* Display client-side base URL for debugging */}
         {process.env.NODE_ENV === 'development' && clientBaseUrl && (
             <p className="text-xs mt-2 text-gray-500">(Debug: Client Base URL: {clientBaseUrl})</p>
         )}
      </div>

      {/* Shared Collection Section */}
        <Card className="w-full max-w-3xl shadow-md">
            <CardHeader>
                <CardTitle>Shared Clipboard</CardTitle>
                <CardDescription>
                    Create a unique URL to access your clipboard items from anywhere. Items added here are synced.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {newCollectionUrl ? (
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Your shared clipboard URL:</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newCollectionUrl}
                                readOnly
                                className="flex-grow p-2 border rounded-md bg-muted text-muted-foreground text-sm"
                                aria-label="Shared Clipboard URL"
                                onFocus={(e) => e.target.select()}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                title="Copy URL"
                                onClick={() => handleCopyToClipboard(newCollectionUrl)}
                            >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Copy URL</span>
                            </Button>
                        </div>
                        <Button onClick={() => router.push(newCollectionUrl)} className="w-full">
                            Go to Shared Clipboard
                        </Button>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Click the button below to generate a new shared clipboard URL.
                    </p>
                )}
            </CardContent>
            <CardFooter>
                 <Button
                    onClick={handleCreateSharedCollection}
                    disabled={isCreating}
                    className="w-full"
                >
                    {isCreating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Share className="mr-2 h-4 w-4" />
                    )}
                    {isCreating ? 'Creating...' : 'Create New Shared Clipboard'}
                </Button>
            </CardFooter>
        </Card>


      {/* Local Clipboard Section */}
      <div className="w-full max-w-3xl mt-8">
         <Card className="shadow-md">
             <CardHeader>
                 <CardTitle>Local Clipboard</CardTitle>
                 <CardDescription>
                     Items added here are stored only in your current browser session and are not shared.
                 </CardDescription>
             </CardHeader>
             <CardContent>
                 <ClipboardManager collectionId={null} />
             </CardContent>
         </Card>
      </div>

    </div>
  );
}
