
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { db, storage, auth } from '@/lib/firebase/config'; // Import auth here as well
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  Timestamp,
  FirestoreError, // Import FirestoreError type
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, StorageError } from 'firebase/storage'; // Import StorageError type
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Image as ImageIcon, Trash2, Upload, Copy, Download, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';

interface ClipboardItem {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'file' | 'url';
  content: string; // Text content or file URL
  fileName?: string; // Original file name
  fileType?: string; // MIME type
  createdAt: Timestamp;
  storagePath?: string; // Path in Firebase Storage for files/images
}

export default function ClipboardManager() {
  const { user, loading: authLoading, initializationError } = useAuth(); // Get initializationError from context
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Tracks loading of clipboard items specifically
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Disable interactions if Firebase isn't initialized or loading auth
  const isDisabled = authLoading || !!initializationError || isUploading;

  // Memoize itemsCollectionRef only if db is available
  const itemsCollectionRef = useMemo(() => {
      if (!db) return null; // Return null if db is not initialized
      return collection(db, 'clipboardItems');
  }, []); // db instance is stable, so no dependency needed unless config changes

  const fetchClipboardItems = useCallback(() => {
      const currentUserId = user?.uid;

      // Exit if Firebase isn't ready, no user, or collection ref is null
      if (initializationError || !db || !itemsCollectionRef || !currentUserId) {
          setClipboardItems([]);
          setIsLoading(false);
          return () => {}; // Return an empty cleanup function
      }

      setIsLoading(true);
      const q = query(
          itemsCollectionRef,
          where('userId', '==', currentUserId),
          orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
              const items = querySnapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
              })) as ClipboardItem[];
              setClipboardItems(items);
              setIsLoading(false);
          },
          (error: FirestoreError) => { // Type the error
              console.error('Error fetching clipboard items:', error);
              toast({
                  title: 'Error',
                  description: `Could not fetch clipboard items: ${error.message}`,
                  variant: 'destructive',
              });
              setIsLoading(false);
          }
      );

      return unsubscribe;

  }, [user?.uid, itemsCollectionRef, initializationError, db]); // Add db and initializationError to dependencies

  useEffect(() => {
    // Only fetch if Firebase is initialized and auth is not loading
    if (!initializationError && !authLoading) {
      const unsubscribe = fetchClipboardItems();
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
       // Ensure loading state is false if we can't fetch
       setIsLoading(false);
       setClipboardItems([]); // Clear items if Firebase isn't ready
    }
  }, [fetchClipboardItems, initializationError, authLoading]);


  const isValidUrl = (string: string): boolean => {
    // Basic check, improve if needed
    return string.startsWith('http://') || string.startsWith('https://');
    // try { // More robust check, but might allow non-http URLs
    //   new URL(string);
    //   return true;
    // } catch (_) {
    //   return false;
    // }
  }

  const handleAddItem = async () => {
    // Ensure Firebase is ready and user is logged in
    if (initializationError || !db || !storage || !itemsCollectionRef || !user) {
      toast({ title: 'Error', description: 'Cannot add item. Firebase not available or user not signed in.', variant: 'destructive' });
      return;
    }

    if (textInput.trim()) {
        const type = isValidUrl(textInput) ? 'url' : 'text';
        try {
            await addDoc(itemsCollectionRef, {
            userId: user.uid,
            type: type,
            content: textInput,
            createdAt: serverTimestamp(),
            });
            setTextInput('');
            toast({ title: 'Success', description: `${type === 'url' ? 'URL' : 'Text'} added to clipboard.` });
        } catch (error: any) {
            console.error('Error adding text/URL item:', error);
            toast({ title: 'Error', description: `Could not add ${type === 'url' ? 'URL' : 'text'} item: ${error.message}`, variant: 'destructive' });
        }
    }

    if (fileInput) {
      setIsUploading(true);
      setUploadProgress(0); // Reset progress
      const fileType = fileInput.type.startsWith('image/') ? 'image' : 'file';
      const storagePath = `clipboard/${user.uid}/${Date.now()}_${fileInput.name}`;
      const storageRef = ref(storage, storagePath);

      try {
        // TODO: Implement progress tracking with uploadBytesResumable if needed
        // For now, simple upload
        const snapshot = await uploadBytes(storageRef, fileInput);
        // Simulate progress for now
        setUploadProgress(100);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await addDoc(itemsCollectionRef, {
          userId: user.uid,
          type: fileType,
          content: downloadURL,
          fileName: fileInput.name,
          fileType: fileInput.type,
          storagePath: storagePath,
          createdAt: serverTimestamp(),
        });

        setFileInput(null);
        // Clear the file input visually
        const fileInputElement = document.getElementById('file-input') as HTMLInputElement;
        if (fileInputElement) {
            fileInputElement.value = '';
        }
        toast({ title: 'Success', description: `${fileType === 'image' ? 'Image' : 'File'} uploaded.` });
      } catch (error: any) {
        console.error(`Error uploading ${fileType}:`, error);
        toast({ title: 'Error', description: `Could not upload ${fileType}: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
  };

   const handlePasteFromClipboard = async () => {
    if (isDisabled) return; // Prevent action if disabled
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


  const handleDeleteItem = async (item: ClipboardItem) => {
    // Ensure Firebase is ready and user is logged in
    if (initializationError || !db || !storage || !user) {
        toast({ title: 'Error', description: 'Cannot delete item. Firebase not available or user not signed in.', variant: 'destructive' });
        return;
    }

    try {
      await deleteDoc(doc(db, 'clipboardItems', item.id));

      // If it's a file or image, delete from storage
      if ((item.type === 'file' || item.type === 'image') && item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef);
      }

      toast({ title: 'Deleted', description: 'Item removed from clipboard.' });
    } catch (error: any) { // Catch FirestoreError or StorageError
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: `Could not delete item: ${error.message}`, variant: 'destructive' });
    }
  };

  const handleCopyToClipboard = (content: string) => {
    if (isDisabled) return;
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

   const handleDownloadFile = (url: string, filename?: string) => {
    if (isDisabled) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = "_blank";
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Download Started', description: filename || 'File download initiated.' });
   };

  const renderItemContent = (item: ClipboardItem) => {
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
      case 'image':
        return (
            <div className="relative w-full max-h-60 overflow-hidden rounded-md my-2 flex justify-center items-center bg-muted/20">
              <Image
                src={item.content}
                alt={item.fileName || 'Uploaded image'}
                width={300}
                height={200}
                sizes="(max-width: 640px) 100vw, 300px"
                style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }}
                className="rounded-md"
                onError={(e) => console.error("Image load error:", e)} // Add error handler
              />
            </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-grow min-w-0" title={item.fileName || 'Uploaded file'}>{item.fileName || 'Uploaded file'}</span>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">Unsupported item type</p>;
    }
  };

  const getItemIcon = (type: ClipboardItem['type']) => {
     switch (type) {
        case 'text': return <Clipboard className="h-5 w-5"/>;
        case 'image': return <ImageIcon className="h-5 w-5"/>;
        case 'file': return <FileText className="h-5 w-5"/>;
        case 'url': return <LinkIcon className="h-5 w-5" />;
        default: return <Clipboard className="h-5 w-5"/>;
     }
  }

  // Show skeleton while auth is loading (initial state)
  if (authLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
             <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-10 w-full" />
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

  // Show Firebase initialization error if present (and not placeholder warning)
  if (initializationError && !initializationError.startsWith('Using placeholder')) {
    return (
        <Alert variant="destructive" className="mt-8">
         <AlertCircle className="h-4 w-4" />
         <AlertTitle>Application Error</AlertTitle>
         <AlertDescription>
           Could not connect to backend services. Please ensure Firebase is configured correctly. ({initializationError})
         </AlertDescription>
       </Alert>
    );
  }
   // Show placeholder warning if applicable
   if (initializationError?.startsWith('Using placeholder')) {
    return (
        <Alert variant="default" className="mt-8 border-orange-500 text-orange-700 dark:border-orange-400 dark:text-orange-300">
            <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            <AlertTitle className="text-orange-700 dark:text-orange-300">Configuration Notice</AlertTitle>
            <AlertDescription>
                {initializationError} Some features might be limited until configured.
            </AlertDescription>
        </Alert>
    );
}

  // Show sign-in prompt if user is not logged in and Firebase is ready
  if (!user) {
    return (
       <Alert className="mt-8">
         <Clipboard className="h-4 w-4" />
         <AlertTitle>Welcome to CrossClip!</AlertTitle>
         <AlertDescription>
           Please sign in using the button in the header to start sharing your clipboard across devices.
         </AlertDescription>
       </Alert>
    );
  }

  // Main component UI for logged-in users
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Add to Clipboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Paste text or type URL here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
                className="pr-12 resize-none"
                disabled={isDisabled}
             />
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                onClick={handlePasteFromClipboard}
                title="Paste from Clipboard"
                disabled={isDisabled}
             >
                <Clipboard className="h-4 w-4" />
                <span className="sr-only">Paste</span>
            </Button>
          </div>
          <div>
            <label htmlFor="file-input" className="text-sm font-medium block mb-2">Or upload a file/image:</label>
            <Input
              id="file-input"
              type="file"
              onChange={(e) => setFileInput(e.target.files ? e.target.files[0] : null)}
              className="file:text-accent file:border-accent hover:file:bg-accent/10 cursor-pointer"
              disabled={isDisabled}
              aria-label="Upload file"
            />
             {isUploading && uploadProgress !== null && (
                 <Progress value={uploadProgress} className="w-full mt-2 h-2" aria-label={`Uploading ${uploadProgress}%`}/>
             )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAddItem}
            disabled={isDisabled || (!textInput.trim() && !fileInput)}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
           >
            <Upload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Add Item'}
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Clipboard History</h2>
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
              <p className="text-muted-foreground text-center">Your shared clipboard is empty. Add some text or upload a file above!</p>
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
                        {item.createdAt?.toDate().toLocaleString() ?? 'Just now'}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4">
                    {renderItemContent(item)}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 py-2 px-4 border-t">
                   {(item.type === 'text' || item.type === 'url') && (
                       <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(item.content)} title="Copy to Clipboard" disabled={isDisabled}>
                         <Copy className="h-4 w-4" />
                         <span className="sr-only">Copy {item.type}</span>
                       </Button>
                    )}
                    {(item.type === 'image' || item.type === 'file') && (
                       <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(item.content, item.fileName)} title="Download" disabled={isDisabled}>
                         <Download className="h-4 w-4" />
                          <span className="sr-only">Download {item.fileName || item.type}</span>
                       </Button>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)} title="Delete" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDisabled}>
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
