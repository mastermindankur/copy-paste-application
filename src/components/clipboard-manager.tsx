
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

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
          toast({ title: 'Error Loading Items', description: message, variant: 'destructive' });
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
            toast({ title: 'Item Added', description: `${type.charAt(0).toUpperCase() + type.slice(1)} content added to the shared clipboard.`, });
        } catch (error) {
             console.error('Failed to add item via API:', error);
             const message = error instanceof Error ? error.message : 'Could not add item.';
             setApiError(message);
             toast({ title: 'Add Failed', description: `Could not add item: ${message}`, variant: 'destructive' });
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
        toast({ title: 'Item Added Locally', description: `${type.charAt(0).toUpperCase() + type.slice(1)} content added to your local history.` });
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
                toast({ title: 'Permission Denied', description: 'Clipboard read access has been denied by your browser.', variant: 'destructive' });
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
                         // Try to get plain text alongside HTML for better data
                         if (item.types.includes('text/plain')) {
                             const plainBlob = await item.getType('text/plain');
                             setTextInput(await plainBlob.text());
                             foundText = true;
                         } else {
                             // Fallback: Use stripped HTML or a placeholder if no plain text
                             // This part can be improved with a basic HTML stripper if needed
                             setTextInput(html.replace(/<[^>]*>?/gm, '')); // Basic stripping
                             foundText = true;
                         }
                        foundHtml = true;
                        toast({ title: 'Pasted Rich Text', description: `Pasted rich text (HTML) into the input area.` });
                        break; // Prioritize HTML
                    } catch (err) { console.error("Error reading HTML from clipboard:", err); }
                } else if (item.types.includes('text/plain') && !foundHtml) {
                     try {
                        const blob = await item.getType('text/plain');
                        const text = await blob.text();
                        setTextInput(text);
                        setHtmlInput(undefined); // Clear HTML if only plain text
                        foundText = true;
                        toast({ title: 'Pasted Plain Text', description: 'Pasted plain text into the input area.' });
                        break;
                    } catch (err) { console.error("Error reading plain text from clipboard:", err); }
                }
            }
             if (!foundText && !foundHtml) {
                 toast({ title: 'Paste Result', description: 'No text or HTML content found in clipboard.', variant: 'default' });
            }
        } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
             // Fallback for browsers that only support readText
            const clipboardContent = await navigator.clipboard.readText();
            if (clipboardContent) {
                setTextInput(clipboardContent);
                setHtmlInput(undefined);
                toast({ title: 'Pasted Plain Text', description: 'Pasted plain text into input area (rich text not checked).' });
            } else {
                toast({ title: 'Paste Result', description: 'Clipboard is empty.', variant: 'default' });
            }
        } else {
             toast({ title: 'Unsupported Feature', description: 'Reading from clipboard is not fully supported by your browser.', variant: 'destructive' });
        }
    } catch (error: any) {
      console.error('Failed to read clipboard contents: ', error);
       if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
         toast({ title: 'Permission Denied', description: 'Clipboard read access was denied.', variant: 'destructive' });
      } else if (error.name === 'DataError'){
         toast({ title: 'Data Error', description: 'Could not read data format from clipboard.', variant: 'destructive' });
      } else {
         toast({ title: 'Clipboard Error', description: 'Could not access clipboard.', variant: 'destructive' });
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
            toast({ title: 'Item Deleted', description: 'Item removed from the shared clipboard.' });
        } catch (error) {
             console.error('Failed to delete item via API:', error);
             const message = error instanceof Error ? error.message : 'Could not delete item.';
             setApiError(message);
             toast({ title: 'Deletion Failed', description: `Could not delete item: ${message}`, variant: 'destructive' });
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
        toast({ title: 'Item Deleted Locally', description: 'Item removed from your local history.' });
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
            toast({ title: 'Secure Connection Required', description: 'Copying to clipboard requires a secure connection (HTTPS).', variant: 'default' });
             // Optionally show manual copy instructions
             // Don't proceed with the API call
             setIsProcessing(false);
             return;
        }

        if (item.type === 'html' && item.htmlContent && navigator.clipboard.write && typeof window.ClipboardItem === 'function') {
             try {
                 // Prepare blobs for ClipboardItem API
                 const plainTextBlob = new Blob([item.content], { type: 'text/plain' });
                 const htmlBlob = new Blob([item.htmlContent], { type: 'text/html' });
                 const clipboardItem = new ClipboardItem({
                     'text/plain': plainTextBlob,
                     'text/html': htmlBlob,
                 });
                 await navigator.clipboard.write([clipboardItem]);
                 toast({ title: 'Copied Rich Text', description: 'Rich text (HTML) copied to clipboard.' });
             } catch(clipboardError) {
                 console.warn('ClipboardItem API failed, falling back to writeText:', clipboardError);
                 // Fallback to copying plain text if rich text fails
                 await navigator.clipboard.writeText(item.content);
                 toast({ title: 'Copied as Plain Text', description: 'Copied content as plain text (rich text copy failed).' });
             }
        } else {
            // Copy plain text or URL using writeText
            await navigator.clipboard.writeText(item.content);
            toast({ title: 'Copied!', description: `${item.type === 'url' ? 'URL' : 'Plain text'} copied to clipboard.` });
        }
    } catch (err: any) {
        console.error('Failed to copy: ', err);
         let description = 'Could not copy content.';
         // Try to provide more specific feedback based on the error
         if (err instanceof DOMException) {
             if (err.name === 'NotAllowedError') {
                 description = 'Clipboard write permission denied. Grant permission or copy manually.';
             } else if (err.message.includes('Permissions Policy') || err.message.includes('permission policy')) {
                 description = 'Clipboard access blocked by browser policy. Copy manually.';
             } else if (err.message.includes('secure context')) {
                 description = 'Copying to clipboard requires a secure connection (HTTPS).';
             }
         }
        toast({ title: 'Copy Failed', description: description, variant: 'destructive' });
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
         // Render HTML content safely using dangerouslySetInnerHTML
         // Ensure the container has appropriate styling (e.g., prose for Tailwind Typography)
         return (
            <div
               className="text-sm prose prose-sm dark:prose-invert max-w-none"
               // Use item.htmlContent if available, otherwise fallback to item.content
               dangerouslySetInnerHTML={{ __html: item.htmlContent || item.content }}
            />
         );
      case 'url':
        // Ensure URL starts with http or https for correct linking
        const href = item.content.match(/^https?:\/\//) ? item.content : `https://${item.content}`;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content} {/* Display the original URL text */}
          </a>
        );
      default:
        return <p className="text-sm text-muted-foreground">Unsupported item type: {item.type}</p>;
    }
  };

  // --- Get Item Icon ---
  const getItemIcon = (type: ClipboardItemData['type']) => {
     switch (type) {
        case 'text': return <FileText className="h-5 w-5 flex-shrink-0"/>;
        case 'html': return <Code className="h-5 w-5 flex-shrink-0" />;
        case 'url': return <LinkIcon className="h-5 w-5 flex-shrink-0" />;
        default: return <Clipboard className="h-5 w-5 flex-shrink-0"/>;
     }
  }

  // --- Format Timestamp ---
  const formatTimestamp = (dateInput: Date | string): string => {
     try {
         const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
         // Check if date is valid after parsing/creation
         if (isNaN(date.getTime())) {
             return 'Invalid Date';
         }
         // Use locale string for user-friendly format
         return date.toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
         });
     } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return 'Date Error';
     }
  }

  return (
    <TooltipProvider> {/* Wrap component with TooltipProvider */}
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
                  placeholder={isSharedMode ? "Paste text, HTML, or a URL to add it to the shared list..." : "Paste or type text, HTML, or a URL to save it locally..."}
                  value={textInput}
                  onChange={(e) => {
                      setTextInput(e.target.value);
                      // If user types, assume it's not the previously pasted HTML
                      if (htmlInput) { setHtmlInput(undefined); }
                  }}
                  rows={6}
                  className="pr-12 resize-y min-h-[120px]"
                  disabled={isProcessing || isLoading} // Disable textarea while processing or loading
                  aria-label="Clipboard input area"
               />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                        onClick={handlePasteFromClipboard}
                        disabled={isProcessing || isLoading}
                    >
                        <Clipboard className="h-4 w-4" />
                        <span className="sr-only">Paste from system clipboard</span>
                    </Button>
                  </TooltipTrigger>
                   <TooltipContent>
                     <p>Paste from system clipboard (reads text/HTML)</p>
                   </TooltipContent>
                </Tooltip>
            </div>
             {htmlInput && (
                 <p className="text-xs text-muted-foreground italic">
                     Pasted content includes rich formatting (HTML).
                 </p>
             )}
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
               <AlertTriangle className="h-5 w-5 flex-shrink-0" />
               <div>
                 <p className="text-sm font-semibold">Error Occurred</p>
                 <p className="text-sm">{apiError}</p>
               </div>
            </div>
         )}


        {/* Clipboard History Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
              {isSharedMode ? 'Shared History' : 'Local History'} ({clipboardItems.length} {clipboardItems.length === 1 ? 'item' : 'items'})
          </h2>
          {isLoading ? (
             <div className="space-y-4">
                {/* Skeletons for paginated items */}
                {[...Array(Math.min(ITEMS_PER_PAGE, 3))].map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full rounded-lg" />
                ))}
                <p className='text-center text-muted-foreground py-4'>Loading history...</p>
             </div>
          ) : clipboardItems.length === 0 ? (
            <Card className="shadow-sm border-dashed border-muted-foreground/50">
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                    {isSharedMode ? 'This shared clipboard is currently empty.' : 'Your local clipboard history is empty.'}
                    <br/>
                    Use the input area above to add your first item!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
            {/* Removed ScrollArea for pagination */}
                  <div className="space-y-4">
                    {paginatedItems.map((item) => (
                      <Card key={item.id} className="shadow-sm transition-all hover:shadow-md overflow-hidden">
                         <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-muted/50">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate mr-2">
                               {getItemIcon(item.type)}
                               <span className="capitalize truncate">{item.type}</span>
                           </div>
                           <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimestamp(item.createdAt)}
                          </span>
                        </CardHeader>
                        {/* Limit content height and make it scrollable if it overflows */}
                        <CardContent className="p-4 max-h-48 overflow-y-auto">
                          {renderItemContent(item)}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-1 py-2 px-3 border-t bg-muted/50">
                          <Tooltip>
                             <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => handleCopyToClipboard(item)} disabled={isProcessing}>
                                  <Copy className="h-4 w-4" />
                                  <span className="sr-only">Copy {item.type}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy {item.type} to clipboard</p>
                              </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10' onClick={() => handleDeleteItem(item.id)} disabled={isProcessing}>
                                   <Trash2 className="h-4 w-4" />
                                   <span className="sr-only">Delete {item.type} item</span>
                                 </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete this item</p>
                              </TooltipContent>
                           </Tooltip>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 mt-6">
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1 || isLoading || isProcessing}
                          aria-label="Go to previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Previous Page</p>
                      </TooltipContent>
                   </Tooltip>

                  <span className="text-sm text-muted-foreground" aria-live="polite">
                    Page {currentPage} of {totalPages}
                  </span>

                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button
                         variant="outline"
                         size="icon"
                         onClick={goToNextPage}
                         disabled={currentPage === totalPages || isLoading || isProcessing}
                         aria-label="Go to next page"
                       >
                         <ChevronRight className="h-4 w-4" />
                       </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Next Page</p>
                      </TooltipContent>
                    </Tooltip>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
