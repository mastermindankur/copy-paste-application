
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use App Router's navigation
import ClipboardManager from '@/components/clipboard-manager';
import { Button } from '@/components/ui/button';
import { Loader2, Share } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionUrl, setNewCollectionUrl] = useState<string | null>(null);


  const handleCreateSharedCollection = async () => {
    setIsCreating(true);
    setNewCollectionUrl(null); // Reset previous URL
    try {
      const response = await fetch('/api/clip/create', {
        method: 'POST',
      });

      let responseBody: any = {}; // Initialize empty object
      let responseText = '';

      try {
            // Try to get the raw text first
            responseText = await response.text();
            // console.log('Raw API Error Response Text:', responseText); // Log raw text
            // Then try to parse it as JSON
            responseBody = JSON.parse(responseText);
        } catch (parseError) {
            // If parsing fails, log the raw text and use a generic error
            console.error('Failed to parse API response as JSON:', parseError);
            console.error('Raw API Response Text (on parse error):', responseText);
            // Use the raw text if it seems like a simple error message, or a generic one
            responseBody = { error: responseText || 'Failed to create shared collection. Invalid API response.' };
        }


      if (!response.ok) {
         // Log the detailed error from the API response if available
         console.error('API Error Response Body:', responseBody);
         // Use the error message from the API response, or a default
         const errorMessage = responseBody.error || 'Failed to create shared collection';
         const errorDetails = responseBody.details || 'No additional details provided.';
         throw new Error(`Failed to create clip collection (Details: ${errorDetails || errorMessage})`);
      }

      const { url, id } = responseBody; // Destructure from parsed body

      if (!url || !id) {
          throw new Error('Invalid response from server: Missing URL or ID.');
      }

      setNewCollectionUrl(url);
      toast({
          title: 'Shared Clipboard Created!',
          description: 'You can now share this URL.',
      });
      // Optionally redirect immediately:
      // router.push(`/clip/${id}`);

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
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyToClipboard(newCollectionUrl)}
                            >
                                Copy
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
      <div className="w-full max-w-3xl">
        {/* Pass collectionId={null} or similar if needed by ClipboardManager */}
        <ClipboardManager collectionId={null} />
      </div>

    </div>
  );
}
