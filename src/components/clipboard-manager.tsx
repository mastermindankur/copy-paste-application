
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Trash2, Upload, Copy, Link as LinkIcon, Code, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { ClipboardItemData } from '@/lib/types';

interface ClipboardManagerProps {
  collectionId: string | null; // null for local-only mode, string for shared collection
  initialItems?: ClipboardItemData[]; // Optional initial items for shared collections
}

const ITEMS_PER_PAGE = 10; // Number of items to display per page

export default function ClipboardManager({ collectionId, initialItems }: ClipboardManagerProps) {
  const [textInput, setTextInput] = useState('');
  const [htmlInput, setHtmlInput] = useState<string | undefined>(undefined);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItemData[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(!initialItems); // Start loading if no initial items
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const isSharedMode = useMemo(() => collectionId !== null, [collectionId]);

  // --- Pagination Calculations ---
  const totalPages = Math.ceil(clipboardItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = clipboardItems.slice(startIndex, endIndex);

  // --- Pagination Handlers ---
  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };


  // --- Data Fetching (only for shared mode) ---
  const fetchItems = useCallback(async () => {
      if (!isSharedMode || !collectionId) {
          setIsLoading(false); // Not shared or no ID, stop loading
          return;
      }
      // console.log(`Fetching items for collection: ${collectionId}`);
      setIsLoading(true);
      setApiError(null);
      try {
          const response = await fetch(`/api/clip/${collectionId}`);
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
              throw new Error(errorData.error || `Failed to fetch items (Status: ${response.status})`);
          }
          const data = await response.json();
           // Ensure items are sorted by date, newest first
           data.items.sort((a: ClipboardItemData, b: ClipboardItemData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setClipboardItems(data.items || []);
          setCurrentPage(1); // Reset to first page on fetch
      } catch (error) {
          console.error("Error fetching items:", error);
          const message = error instanceof Error ? error.message : 'Could not load items.';
          setApiError(message);
          toast({ title: 'Error', description: message, variant: 'destructive' });
          setClipboardItems([]); // Clear items on error
      } finally {
          setIsLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, isSharedMode]); // Re-fetch if collectionId changes

  // Fetch items when component mounts in shared mode or when initialItems change
  useEffect(() => {
      if (isSharedMode && !initialItems) { // Fetch only if shared and no initial items provided
          fetchItems();
      } else {
         setIsLoading(false); // Mark as not loading if local or initial items provided
      }
  }, [fetchItems, isSharedMode, initialItems]);

   // Update local state if initialItems prop changes (e.g., parent refreshes)
   useEffect(() => {
        if (initialItems) {
            // Sort initial items as well
            const sortedInitialItems = [...initialItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setClipboardItems(sortedInitialItems);
            setCurrentPage(1); // Reset to first page if initial items change
            setIsLoading(false); // Ensure loading is false if initial items are provided
        }
   }, [initialItems]);


  // --- Basic URL validation ---
  const isValidUrl = (string: string): boolean => {
      // Basic check, improve if needed
      return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=#]*)?$/.test(string) ||
             /^([\w-]+\.)+[\w-]+(\/[\w-./?%&=#]*)?$/.test(string);
  }

  // --- Add Item ---
  const handleAddItem = async () => {
    if (isProcessing || !textInput.trim()) return;

    setIsProcessing(true);
    setApiError(null);

    let type: ClipboardItemData['type'] = 'text';
    if (isValidUrl(textInput)) {
        type = 'url';
    } else if (htmlInput) {
        type = 'html';
    }

    const newItemData: Omit<ClipboardItemData, 'id' | 'createdAt'> = {
      type: type,
      content: textInput,
      htmlContent: type === 'html' ? htmlInput : undefined,
    };


    if (isSharedMode && collectionId) {
        // --- Add item via API ---
        try {
            const response = await fetch(`/api/clip/add/${collectionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItemData),
            });
            const addedItem = await response.json();
            if (!response.ok) {
                 throw new Error(addedItem.error || addedItem.details || 'Failed to add item.');
            }
             // Prepend the successfully added item (returned from API) to the local state
            setClipboardItems(prevItems => [addedItem, ...prevItems]);
            setCurrentPage(1); // Go to first page to see the new item
            toast({ title: 'Success', description: `${type.toUpperCase()} added to shared clipboard.` });
        } catch (error) {
             console.error('Failed to add item via API:', error);
             const message = error instanceof Error ? error.message : 'Could not add item.';
             setApiError(message);
             toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }

    } else {
        // --- Add item locally (Session Storage) ---
         const newItem: ClipboardItemData = {
             ...newItemData,
             id: crypto.randomUUID(),
             createdAt: new Date(), // Use Date object for local
         };
        setClipboardItems(prevItems => [newItem, ...prevItems]);
        setCurrentPage(1); // Go to first page to see the new item
        toast({ title: 'Success', description: `${type.toUpperCase()} added to local clipboard.` });
        setIsProcessing(false);
    }

    // Clear input fields regardless of success/failure in adding
    setTextInput('');
    setHtmlInput(undefined);
  };

  // --- Paste from System Clipboard ---
   const handlePasteFromClipboard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setApiError(null); // Clear previous API errors on new action
    try {
        if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
            const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
             if (permission.state === 'denied') {
                toast({ title: 'Permission Denied', description: 'Clipboard read access denied.', variant: 'destructive' });
                setIsProcessing(false);
                return;
             }

            const clipboardContents = await navigator.clipboard.read();
            let foundText = false;
            let foundHtml = false;

            for (const item of clipboardContents) {
                if (item.types.includes('text/html')) {
                    try {
                        const blob = await item.getType('text/html');
                        const html = await blob.text();
                        setHtmlInput(html);
                         if (item.types.includes('text/plain')) {
                             const plainBlob = await item.getType('text/plain');
                             setTextInput(await plainBlob.text());
                             foundText = true;
                         } else {
                             setTextInput(html); // Fallback, might need stripping
                             foundText = true;
                         }
                        foundHtml = true;
                        break; // Prioritize HTML
                    } catch (err) { console.error("Error reading HTML from clipboard:", err); }
                } else if (item.types.includes('text/plain') && !foundHtml) {
                     try {
                        const blob = await item.getType('text/plain');
                        const text = await blob.text();
                        setTextInput(text);
                        setHtmlInput(undefined); // Clear HTML if only plain text
                        foundText = true;
                        break;
                    } catch (err) { console.error("Error reading plain text from clipboard:", err); }
                }
            }
            if (foundText || foundHtml) {
                 toast({ title: 'Pasted', description: `Pasted ${foundHtml ? 'rich text (HTML)' : 'plain text'} into input area.` });
            } else {
                 toast({ title: 'Empty or Unsupported', description: 'No text or HTML found in clipboard.', variant: 'default' });
            }
        } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
            const clipboardContent = await navigator.clipboard.readText();
            if (clipboardContent) {
                setTextInput(clipboardContent);
                setHtmlInput(undefined);
                toast({ title: 'Pasted', description: 'Pasted plain text into input area.' });
            } else {
                toast({ title: 'Empty Clipboard', description: 'Nothing found in clipboard to paste.', variant: 'default' });
            }
        } else {
             toast({ title: 'Unsupported', description: 'Clipboard API not fully supported.', variant: 'destructive' });
        }
    } catch (error: any) {
      console.error('Failed to read clipboard contents: ', error);
       if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
         toast({ title: 'Permission Denied', description: 'Clipboard access was denied.', variant: 'destructive' });
      } else if (error.name === 'DataError'){
         toast({ title: 'Data Error', description: 'Could not read clipboard data format.', variant: 'destructive' });
      } else {
         toast({ title: 'Error', description: 'Could not access clipboard.', variant: 'destructive' });
      }
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Delete Item ---
  const handleDeleteItem = async (id: string) => {
     if (isProcessing) return;
     setIsProcessing(true);
     setApiError(null);

     if (isSharedMode && collectionId) {
        // --- Delete item via API ---
        try {
            const response = await fetch(`/api/clip/delete/${collectionId}/${id}`, {
                 method: 'DELETE',
            });
            const result = await response.json();
             if (!response.ok) {
                 throw new Error(result.error || result.details || 'Failed to delete item.');
             }
             // Remove item locally on successful API call
            setClipboardItems(prevItems => {
                const newItems = prevItems.filter(item => item.id !== id);
                 // Adjust current page if the last item on the page was deleted
                const newTotalPages = Math.ceil(newItems.length / ITEMS_PER_PAGE);
                if (currentPage > newTotalPages && newTotalPages > 0) {
                    setCurrentPage(newTotalPages);
                } else if (newTotalPages === 0) {
                    setCurrentPage(1); // Go back to page 1 if list becomes empty
                }
                return newItems;
            });
            toast({ title: 'Deleted', description: 'Item removed from shared clipboard.' });
        } catch (error) {
             console.error('Failed to delete item via API:', error);
             const message = error instanceof Error ? error.message : 'Could not delete item.';
             setApiError(message);
             toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }

     } else {
        // --- Delete item locally ---
        setClipboardItems(prevItems => {
            const newItems = prevItems.filter(item => item.id !== id);
            // Adjust current page if the last item on the page was deleted
            const newTotalPages = Math.ceil(newItems.length / ITEMS_PER_PAGE);
             if (currentPage > newTotalPages && newTotalPages > 0) {
                setCurrentPage(newTotalPages);
            } else if (newTotalPages === 0) {
                setCurrentPage(1); // Go back to page 1 if list becomes empty
            }
            return newItems;
        });
        toast({ title: 'Deleted', description: 'Item removed from local clipboard.' });
        setIsProcessing(false);
     }
  };

  // --- Copy Item to System Clipboard ---
  const handleCopyToClipboard = async (item: ClipboardItemData) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setApiError(null);

    try {
        // Check for secure context (HTTPS), required by clipboard API except for localhost
        if (typeof window !== 'undefined' && !window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            console.warn('Clipboard API requires a secure context (HTTPS).');
            toast({ title: 'Warning', description: 'Copying to clipboard requires a secure connection (HTTPS).', variant: 'destructive' });
             // Optionally show manual copy instructions
             // Don't proceed with the API call
             setIsProcessing(false);
             return;
        }

        if (item.type === 'html' && item.htmlContent && navigator.clipboard.write && typeof window.ClipboardItem === 'function') {
             try {
                 const plainTextBlob = new Blob([item.content], { type: 'text/plain' });
                 const htmlBlob = new Blob([item.htmlContent], { type: 'text/html' });
                 const clipboardItem = new ClipboardItem({
                     'text/plain': plainTextBlob,
                     'text/html': htmlBlob,
                 });
                 await navigator.clipboard.write([clipboardItem]);
                 toast({ title: 'Copied!', description: 'Rich text (HTML) copied.' });
             } catch(clipboardError) {
                 console.warn('ClipboardItem API failed, falling back to writeText:', clipboardError);
                 await navigator.clipboard.writeText(item.content);
                 toast({ title: 'Copied!', description: 'Copied as plain text (rich text copy failed).' });
             }
        } else {
            // Copy plain text or URL
            await navigator.clipboard.writeText(item.content);
            toast({ title: 'Copied!', description: `${item.type === 'url' ? 'URL' : 'Plain text'} copied.` });
        }
    } catch (err: any) {
        console.error('Failed to copy: ', err);
         let description = 'Could not copy content.';
         // Try to provide more specific feedback based on the error
         if (err instanceof DOMException) {
             if (err.name === 'NotAllowedError') {
                 description = 'Clipboard write permission denied. Please grant permission in your browser or copy manually.';
             } else if (err.message.includes('Permissions Policy') || err.message.includes('permission policy')) {
                 description = 'Clipboard access blocked by browser policy. Please copy manually.';
             } else if (err.message.includes('secure context')) {
                 description = 'Copying to clipboard requires a secure connection (HTTPS).';
             }
         }
        toast({ title: 'Error', description: description, variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Render Item Content ---
  const renderItemContent = (item: ClipboardItemData) => {
    switch (item.type) {
      case 'text':
        return <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>;
      case 'html':
         return (
            <div
               className="text-sm prose prose-sm dark:prose-invert max-w-none"
               // Use item.htmlContent if available, otherwise fallback to item.content
               // This assumes item.content might sometimes contain HTML if htmlContent is missing
               dangerouslySetInnerHTML={{ __html: item.htmlContent || item.content }}
            />
         );
      case 'url':
        const href = item.content.match(/^https?:\/\//) ? item.content : `https://${item.content}`;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content}
          </a>
        );
      default:
        return <p className="text-sm text-muted-foreground">Unsupported item type</p>;
    }
  };

  // --- Get Item Icon ---
  const getItemIcon = (type: ClipboardItemData['type']) => {
     switch (type) {
        case 'text': return <FileText className="h-5 w-5"/>;
        case 'html': return <Code className="h-5 w-5" />;
        case 'url': return <LinkIcon className="h-5 w-5" />;
        default: return <Clipboard className="h-5 w-5"/>;
     }
  }

  // --- Format Timestamp ---
  const formatTimestamp = (dateInput: Date | string): string => {
     try {
         const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
         // Check if date is valid after parsing/creation
         if (isNaN(date.getTime())) {
             return 'Invalid date';
         }
         return date.toLocaleString(); // Or use date-fns for more control
     } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return 'Invalid date';
     }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Add Item Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">
              {isSharedMode ? 'Add to Shared Clipboard' : 'Add to Local Clipboard'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Paste or type text, HTML, or URL here..."
                value={textInput}
                onChange={(e) => {
                    setTextInput(e.target.value);
                    if (htmlInput) { setHtmlInput(undefined); }
                }}
                rows={6}
                className="pr-12 resize-y min-h-[120px]"
                disabled={isProcessing || isLoading} // Disable textarea while processing or loading
             />
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                onClick={handlePasteFromClipboard}
                title="Paste from Clipboard (reads text and HTML)"
                disabled={isProcessing || isLoading}
             >
                <Clipboard className="h-4 w-4" />
                <span className="sr-only">Paste</span>
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleAddItem}
            disabled={isProcessing || isLoading || !textInput.trim()}
            className="w-full"
           >
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? 'Adding...' : (isSharedMode ? 'Add Item to Shared' : 'Add Item to Local')}
          </Button>
        </CardFooter>
      </Card>

       {/* API Error Display */}
       {apiError && (
          <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/30 flex items-center gap-3">
             <AlertTriangle className="h-5 w-5" />
             <p className="text-sm font-medium">{apiError}</p>
          </div>
       )}


      {/* Clipboard History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
            {isSharedMode ? 'Shared History' : 'Local History'}
        </h2>
        {isLoading ? (
           <div className="space-y-4">
              {/* Skeletons for paginated items */}
              {[...Array(Math.min(ITEMS_PER_PAGE, 3))].map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full" />
              ))}
           </div>
        ) : clipboardItems.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">
                  {isSharedMode ? 'This shared clipboard is empty.' : 'Your local clipboard is empty.'} Add some items!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
          {/* ScrollArea is removed for pagination, content fits in cards */}
             {/*<ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-card"> */}
                <div className="space-y-4">
                  {paginatedItems.map((item) => (
                    <Card key={item.id} className="shadow-sm transition-all hover:shadow-md overflow-hidden">
                       <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-muted/50">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                             {getItemIcon(item.type)}
                             <span className="capitalize">{item.type}</span>
                         </div>
                         <span className="text-xs text-muted-foreground">
                            {formatTimestamp(item.createdAt)}
                        </span>
                      </CardHeader>
                      <CardContent className="p-4 max-h-48 overflow-y-auto">
                        {renderItemContent(item)}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 py-2 px-4 border-t bg-muted/50">
                        <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(item)} title={`Copy ${item.type}`} disabled={isProcessing}>
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copy {item.type}</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} title="Delete" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {item.type} item</span>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
             {/* </ScrollArea> */}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1 || isLoading || isProcessing}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Page</span>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || isLoading || isProcessing}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Page</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
