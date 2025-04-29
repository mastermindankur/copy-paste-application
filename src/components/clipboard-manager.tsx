'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { db, storage } from '@/lib/firebase/config';
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
  getFirestore, // Import getFirestore if db is not directly the instance
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Image as ImageIcon, Trash2, Upload, Copy, Download, Link as LinkIcon } from 'lucide-react';
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
  const { user, loading: authLoading } = useAuth();
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Memoize itemsCollectionRef to ensure stable reference
  const itemsCollectionRef = useMemo(() => {
      // Ensure db is the Firestore instance. If db is from getFirestore(), this is fine.
      // If db is just the app instance, you might need getFirestore(db) here.
      // Assuming db from './config' is the Firestore instance.
      return collection(db, 'clipboardItems');
  }, []); // Empty dependency array means it's created once

  const fetchClipboardItems = useCallback(() => {
      const currentUserId = user?.uid; // Get current user ID

      if (!currentUserId) {
          setClipboardItems([]);
          setIsLoading(false);
          return () => {}; // Return an empty cleanup function if no user
      }

      setIsLoading(true);
      const q = query(
          itemsCollectionRef,
          where('userId', '==', currentUserId),
          orderBy('createdAt', 'desc')
      );

      // onSnapshot returns the unsubscribe function directly
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
          (error) => {
              console.error('Error fetching clipboard items:', error);
              toast({
                  title: 'Error',
                  description: 'Could not fetch clipboard items.',
                  variant: 'destructive',
              });
              setIsLoading(false);
          }
      );

      // Return the unsubscribe function provided by onSnapshot
      return unsubscribe;

  }, [user?.uid, itemsCollectionRef]); // Dependencies: only change if user ID or collection ref changes

  useEffect(() => {
      const unsubscribe = fetchClipboardItems();

      // Cleanup function will be called when component unmounts or dependencies change
      return () => {
          if (unsubscribe) {
              unsubscribe();
          }
      };
  }, [fetchClipboardItems]); // useEffect depends on the memoized fetchClipboardItems


  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  const handleAddItem = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be signed in.', variant: 'destructive' });
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
        } catch (error) {
            console.error('Error adding text/URL item:', error);
            toast({ title: 'Error', description: `Could not add ${type === 'url' ? 'URL' : 'text'} item.`, variant: 'destructive' });
        }
    }

    if (fileInput) {
      setIsUploading(true);
      setUploadProgress(0);
      const fileType = fileInput.type.startsWith('image/') ? 'image' : 'file';
      const storagePath = `clipboard/${user.uid}/${Date.now()}_${fileInput.name}`;
      const storageRef = ref(storage, storagePath);

      try {
        // TODO: Implement progress tracking with uploadBytesResumable if needed
        const snapshot = await uploadBytes(storageRef, fileInput);
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
      } catch (error) {
        console.error(`Error uploading ${fileType}:`, error);
        toast({ title: 'Error', description: `Could not upload ${fileType}.`, variant: 'destructive' });
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
  };

   const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await navigator.clipboard.readText();
      if (clipboardContent) {
        setTextInput(clipboardContent);
        toast({ title: 'Pasted', description: 'Content pasted from clipboard.' });
      } else {
        toast({ title: 'Empty Clipboard', description: 'Nothing found in clipboard to paste.', variant: 'default' }); // Changed variant
      }
    } catch (error: any) {
      console.error('Failed to read clipboard contents: ', error);
       // Check for specific error name for permissions
      if (error.name === 'NotAllowedError') {
         toast({ title: 'Permission Denied', description: 'Clipboard access was denied. Please grant permission in your browser settings.', variant: 'destructive' });
      } else {
         toast({ title: 'Error', description: 'Could not access clipboard.', variant: 'destructive' });
      }
    }
  };


  const handleDeleteItem = async (item: ClipboardItem) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'clipboardItems', item.id));

      // If it's a file or image, delete from storage
      if ((item.type === 'file' || item.type === 'image') && item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef);
      }

      toast({ title: 'Deleted', description: 'Item removed from clipboard.' });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Error', description: 'Could not delete item.', variant: 'destructive' });
    }
  };

  const handleCopyToClipboard = (content: string) => {
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
    // Basic download - more robust solution might be needed for cross-origin
    const link = document.createElement('a');
    link.href = url;
    link.target = "_blank"; // Open in new tab to trigger download for certain file types
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
        return (
          <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content}
          </a>
        );
      case 'image':
        return (
            <div className="relative w-full max-h-60 overflow-hidden rounded-md my-2 flex justify-center items-center bg-muted/20">
              {/* Added loading state for image */}
              <Image
                src={item.content}
                alt={item.fileName || 'Uploaded image'}
                width={300} // Set a base width
                height={200} // Set a base height
                sizes="(max-width: 640px) 100vw, 300px" // Responsive sizes
                style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto' }} // Ensure image scales correctly
                className="rounded-md"
                // Optional: add placeholder and blurDataURL for better loading UX
                // placeholder="blur"
                // blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
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

  if (!user) {
    return (
       <Alert className="mt-8">
         <Clipboard className="h-4 w-4" />
         <AlertTitle>Welcome to CrossClip!</AlertTitle>
         <AlertDescription>
           Please sign in to start sharing your clipboard across devices.
         </AlertDescription>
       </Alert>
    );
  }

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
                className="pr-12 resize-none" // Added resize-none
                disabled={isUploading}
             />
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                onClick={handlePasteFromClipboard}
                title="Paste from Clipboard"
                disabled={isUploading}
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
              className="file:text-accent file:border-accent hover:file:bg-accent/10 cursor-pointer" // Added cursor-pointer
              disabled={isUploading}
              aria-label="Upload file" // Added aria-label
            />
             {isUploading && uploadProgress !== null && (
                 <Progress value={uploadProgress} className="w-full mt-2 h-2" aria-label={`Uploading ${uploadProgress}%`}/> // Added aria-label
             )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddItem} disabled={(!textInput.trim() && !fileInput) || isUploading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Upload className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Add Item'}
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Clipboard History</h2>
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
             <p className="sr-only">List of clipboard items</p> {/* Accessibility improvement */}
            <div className="space-y-4">
              {clipboardItems.map((item) => (
                <Card key={item.id} className="shadow-sm transition-all hover:shadow-md">
                   <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                         {getItemIcon(item.type)}
                         <span className="capitalize">{item.type}</span> {/* Use capitalize class */}
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
                       <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(item.content)} title="Copy to Clipboard">
                         <Copy className="h-4 w-4" />
                         <span className="sr-only">Copy {item.type}</span>
                       </Button>
                    )}
                    {(item.type === 'image' || item.type === 'file') && (
                       <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(item.content, item.fileName)} title="Download">
                         <Download className="h-4 w-4" />
                          <span className="sr-only">Download {item.fileName || item.type}</span>
                       </Button>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)} title="Delete" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
