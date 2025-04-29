
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// import { Input } from '@/components/ui/input'; // File input removed for now
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Image as ImageIcon, Trash2, Upload, Copy, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import Image from 'next/image'; // Image component removed
// import { Progress } from './ui/progress'; // Progress component removed
import { Skeleton } from './ui/skeleton'; // Keep Skeleton for initial loading state

// Define a simpler local clipboard item structure
interface LocalClipboardItem {
  id: string;
  type: 'text' | 'url';
  content: string; // Text content or URL
  createdAt: Date;
}

export default function ClipboardManager() {
  const [textInput, setTextInput] = useState('');
  // const [fileInput, setFileInput] = useState<File | null>(null); // Removed file state
  const [clipboardItems, setClipboardItems] = useState<LocalClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Simplified loading state
  // const [uploadProgress, setUploadProgress] = useState<number | null>(null); // Removed upload progress
  const [isProcessing, setIsProcessing] = useState(false); // Generic processing state

  // Load items from local storage on mount (optional persistence)
  // useEffect(() => {
  //   const storedItems = localStorage.getItem('crossclip_items');
  //   if (storedItems) {
  //     try {
  //       const parsedItems = JSON.parse(storedItems).map((item: any) => ({
  //           ...item,
  //           createdAt: new Date(item.createdAt) // Ensure date is parsed correctly
  //       }));
  //       setClipboardItems(parsedItems);
  //     } catch (error) {
  //       console.error("Failed to load items from local storage:", error);
  //       localStorage.removeItem('crossclip_items'); // Clear corrupted data
  //     }
  //   }
  //   setIsLoading(false); // Finish loading after attempting to load from storage
  // }, []);

  // // Save items to local storage whenever they change (optional persistence)
  // useEffect(() => {
  //   // Debounce or check if loading to prevent excessive writes might be good here
  //   localStorage.setItem('crossclip_items', JSON.stringify(clipboardItems));
  // }, [clipboardItems]);


  const isValidUrl = (string: string): boolean => {
    // Basic check, improve if needed
    return string.startsWith('http://') || string.startsWith('https://');
  }

  const handleAddItem = async () => {
    if (isProcessing) return; // Prevent multiple adds

    if (textInput.trim()) {
      setIsProcessing(true);
      const type = isValidUrl(textInput) ? 'url' : 'text';
      const newItem: LocalClipboardItem = {
        id: crypto.randomUUID(), // Generate a simple unique ID
        type: type,
        content: textInput,
        createdAt: new Date(),
      };

      // Simulate async operation if needed, or just update state
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay

      setClipboardItems(prevItems => [newItem, ...prevItems]); // Add to the beginning
      setTextInput('');
      toast({ title: 'Success', description: `${type === 'url' ? 'URL' : 'Text'} added locally.` });
      setIsProcessing(false);
    }

    // --- File/Image Handling Removed ---
    // if (fileInput) {
    //   // ... local handling logic (e.g., read as data URI)
    //   // This requires more complex state management and potential size limits
    //   toast({ title: 'Info', description: 'File/Image upload is not yet supported locally.', variant: 'default' });
    //   setFileInput(null);
    // }
    // --- End File/Image Handling Removal ---
  };

   const handlePasteFromClipboard = async () => {
    if (isProcessing) return;
    try {
      const clipboardContent = await navigator.clipboard.readText();
      if (clipboardContent) {
        setTextInput(clipboardContent);
        toast({ title: 'Pasted', description: 'Content pasted from clipboard.' });
      } else {
        toast({ title: 'Empty Clipboard', description: 'Nothing found in clipboard to paste.', variant: 'default' });
      }
    } catch (error: any) {
      console.error('Failed to read clipboard contents: ', error);
      if (error.name === 'NotAllowedError') {
         toast({ title: 'Permission Denied', description: 'Clipboard access was denied. Please grant permission in your browser settings.', variant: 'destructive' });
      } else {
         toast({ title: 'Error', description: 'Could not access clipboard.', variant: 'destructive' });
      }
    }
  };


  const handleDeleteItem = async (id: string) => {
     if (isProcessing) return;
     setIsProcessing(true);
     // Simulate async operation if needed
     await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
     setClipboardItems(prevItems => prevItems.filter(item => item.id !== id));
     toast({ title: 'Deleted', description: 'Item removed locally.' });
     setIsProcessing(false);
  };

  const handleCopyToClipboard = (content: string) => {
    if (isProcessing) return;
    navigator.clipboard.writeText(content).then(
      () => {
        toast({ title: 'Copied!', description: 'Content copied to clipboard.' });
      },
      (err) => {
        console.error('Failed to copy: ', err);
        toast({ title: 'Error', description: 'Could not copy content.', variant: 'destructive' });
      }
    );
  };

   // --- Download File Removed ---
   // const handleDownloadFile = (url: string, filename?: string) => { ... }
   // --- End Download File Removal ---

  const renderItemContent = (item: LocalClipboardItem) => {
    switch (item.type) {
      case 'text':
        return <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>;
      case 'url':
        // Ensure URL has protocol for link to work correctly
        const href = item.content.startsWith('http://') || item.content.startsWith('https://') ? item.content : `https://${item.content}`;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content} {/* Display original content */}
          </a>
        );
        // --- Image/File Cases Removed ---
      // case 'image':
      //   return ( ... );
      // case 'file':
      //   return ( ... );
        // --- End Image/File Cases Removal ---
      default:
        // Should not happen with local items, but good practice
        return <p className="text-sm text-muted-foreground">Unsupported item type</p>;
    }
  };

  const getItemIcon = (type: LocalClipboardItem['type']) => {
     switch (type) {
        case 'text': return <Clipboard className="h-5 w-5"/>;
        // case 'image': return <ImageIcon className="h-5 w-5"/>; // Removed
        // case 'file': return <FileText className="h-5 w-5"/>; // Removed
        case 'url': return <LinkIcon className="h-5 w-5" />;
        default: return <Clipboard className="h-5 w-5"/>;
     }
  }

  // Show skeleton briefly on initial load (optional, could be removed if no async loading)
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
             <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-20 w-full" />
             {/* <Skeleton className="h-10 w-full" /> File input skeleton removed */}
             <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
        <div className="mt-8 space-y-4">
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }


  // Main component UI
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Add to Local Clipboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Paste text or type URL here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
                className="pr-12 resize-none"
                disabled={isProcessing}
             />
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                onClick={handlePasteFromClipboard}
                title="Paste from Clipboard"
                disabled={isProcessing}
             >
                <Clipboard className="h-4 w-4" />
                <span className="sr-only">Paste</span>
            </Button>
          </div>
           {/* --- File Input Removed --- */}
          {/* <div>
            <label htmlFor="file-input" className="text-sm font-medium block mb-2">Or upload a file/image:</label>
            <Input
              id="file-input"
              type="file"
              onChange={(e) => setFileInput(e.target.files ? e.target.files[0] : null)}
              className="file:text-accent file:border-accent hover:file:bg-accent/10 cursor-pointer"
              disabled={isProcessing}
              aria-label="Upload file"
            />
             {isUploading && uploadProgress !== null && ( // isProcessing replaces isUploading
                 <Progress value={uploadProgress} className="w-full mt-2 h-2" aria-label={`Uploading ${uploadProgress}%`}/>
             )}
          </div> */}
          {/* --- End File Input Removal --- */}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAddItem}
            // disabled={isProcessing || (!textInput.trim() && !fileInput)} // fileInput removed
            disabled={isProcessing || !textInput.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
           >
            <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Adding...' : 'Add Item'}
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Local Clipboard History</h2>
        {/* Show skeleton for clipboard items while they are loading */}
        {isLoading ? (
           <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
           </div>
        ) : clipboardItems.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Your local clipboard is empty. Add some text or a URL above!</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-card">
             <p className="sr-only">List of clipboard items</p>
            <div className="space-y-4">
              {clipboardItems.map((item) => (
                <Card key={item.id} className="shadow-sm transition-all hover:shadow-md">
                   <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                         {getItemIcon(item.type)}
                         <span className="capitalize">{item.type}</span>
                     </div>
                     <span className="text-xs text-muted-foreground">
                        {item.createdAt?.toLocaleString() ?? 'Just now'}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4">
                    {renderItemContent(item)}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 py-2 px-4 border-t">
                   {(item.type === 'text' || item.type === 'url') && (
                       <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(item.content)} title="Copy to Clipboard" disabled={isProcessing}>
                         <Copy className="h-4 w-4" />
                         <span className="sr-only">Copy {item.type}</span>
                       </Button>
                    )}
                    {/* --- Download Button Removed --- */}
                    {/* {(item.type === 'image' || item.type === 'file') && ( ... )} */}
                    {/* --- End Download Button Removal --- */}
                     <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} title="Delete" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                       <Trash2 className="h-4 w-4" />
                       <span className="sr-only">Delete {item.type} item</span>
                     </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
