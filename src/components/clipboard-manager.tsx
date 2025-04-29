
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Trash2, Upload, Copy, Link as LinkIcon, Code, Check } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { ClipboardItemData } from '@/lib/types'; // Use updated type

export default function ClipboardManager() {
  const [textInput, setTextInput] = useState('');
  const [htmlInput, setHtmlInput] = useState<string | undefined>(undefined);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);


  // Basic URL validation
  const isValidUrl = (string: string): boolean => {
      // Basic check, improve if needed (e.g., check TLD)
      // Allow simple strings that look like domains too for flexibility
      return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=#]*)?$/.test(string) ||
             /^([\w-]+\.)+[\w-]+(\/[\w-./?%&=#]*)?$/.test(string);
  }

  const handleAddItem = async () => {
    if (isProcessing || !textInput.trim()) return;

    setIsProcessing(true);
    let type: ClipboardItemData['type'] = 'text';
    if (isValidUrl(textInput)) {
        type = 'url';
    } else if (htmlInput) {
        type = 'html';
    }

    const newItem: ClipboardItemData = {
      id: crypto.randomUUID(),
      type: type,
      content: textInput,
      htmlContent: type === 'html' ? htmlInput : undefined,
      createdAt: new Date(), // Use Date object for local display formatting
    };

    // Simulate async operation for feedback if needed, otherwise remove
    await new Promise(resolve => setTimeout(resolve, 50));

    setClipboardItems(prevItems => [newItem, ...prevItems]);
    setTextInput('');
    setHtmlInput(undefined);
    toast({ title: 'Success', description: `${type.toUpperCase()} added to local clipboard.` });
    setIsProcessing(false);
  };

   const handlePasteFromClipboard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
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
                             // Fallback: Use HTML content as plain text if text/plain is not available
                             setTextInput(html); // This might need stripping, but fine for display
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
                        setHtmlInput(undefined); // Clear HTML if only plain text is pasted
                        foundText = true;
                        break; // Found plain text, stop searching
                    } catch (err) { console.error("Error reading plain text from clipboard:", err); }
                }
            }
            if (foundText || foundHtml) {
                 toast({ title: 'Pasted', description: `Pasted ${foundHtml ? 'rich text (HTML)' : 'plain text'} from clipboard.` });
            } else {
                 toast({ title: 'Empty or Unsupported', description: 'No text or HTML found in clipboard.', variant: 'default' });
            }
        } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
             // Fallback for browsers supporting only readText
            const clipboardContent = await navigator.clipboard.readText();
            if (clipboardContent) {
                setTextInput(clipboardContent);
                setHtmlInput(undefined);
                toast({ title: 'Pasted', description: 'Pasted plain text from clipboard.' });
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


  const handleDeleteItem = async (id: string) => {
     if (isProcessing) return;
     setIsProcessing(true);
     // Simulate async operation for feedback if needed, otherwise remove
     await new Promise(resolve => setTimeout(resolve, 50));
     setClipboardItems(prevItems => prevItems.filter(item => item.id !== id));
     toast({ title: 'Deleted', description: 'Item removed from local clipboard.' });
     setIsProcessing(false);
  };

  const handleCopyToClipboard = async (item: ClipboardItemData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
        // Use ClipboardItem API for HTML if available and supported
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
                 // Fallback to copying plain text if ClipboardItem fails
                 await navigator.clipboard.writeText(item.content);
                 toast({ title: 'Copied!', description: 'Copied as plain text (rich text copy failed).' });
             }
        } else {
            // Copy plain text or URL
            await navigator.clipboard.writeText(item.content);
            toast({ title: 'Copied!', description: `${item.type === 'url' ? 'URL' : 'Plain text'} copied.` });
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast({ title: 'Error', description: 'Could not copy content.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const renderItemContent = (item: ClipboardItemData) => {
    switch (item.type) {
      case 'text':
        return <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>;
      case 'html':
         // Use dangerouslySetInnerHTML cautiously. Ensure content is trusted or sanitized.
         return (
            <div
               className="text-sm prose prose-sm dark:prose-invert max-w-none"
               dangerouslySetInnerHTML={{ __html: item.htmlContent || item.content }}
            />
         );
      case 'url':
        // Prepend https:// if no protocol is present
        const href = item.content.match(/^https?:\/\//) ? item.content : `https://${item.content}`;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content} {/* Display original content */}
          </a>
        );
      default:
        // Should not happen based on types, but good fallback
        return <p className="text-sm text-muted-foreground">Unsupported item type</p>;
    }
  };

  const getItemIcon = (type: ClipboardItemData['type']) => {
     switch (type) {
        case 'text': return <FileText className="h-5 w-5"/>;
        case 'html': return <Code className="h-5 w-5" />;
        case 'url': return <LinkIcon className="h-5 w-5" />;
        default: return <Clipboard className="h-5 w-5"/>;
     }
  }

   // Simulate loading delay for initial render
   useEffect(() => {
     const timer = setTimeout(() => setIsLoading(false), 300);
     return () => clearTimeout(timer);
   }, []);


  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Add Item Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Add to Local Clipboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Paste or type text, HTML, or URL here..."
                value={textInput}
                onChange={(e) => {
                    setTextInput(e.target.value);
                    // Clear potentially stale HTML if user types plain text
                    if (htmlInput) { setHtmlInput(undefined); }
                }}
                rows={6} // Adjust rows as needed
                className="pr-12 resize-y min-h-[120px]" // Allow vertical resize
                disabled={isProcessing}
             />
             {/* Paste Button */}
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-accent"
                onClick={handlePasteFromClipboard}
                title="Paste from Clipboard (reads text and HTML)"
                disabled={isProcessing}
             >
                <Clipboard className="h-4 w-4" />
                <span className="sr-only">Paste</span>
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          {/* Add Item Button */}
          <Button
            onClick={handleAddItem}
            disabled={isProcessing || !textInput.trim()}
            className="w-full" // Use default primary button style
           >
            <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Adding...' : 'Add Item to Local'}
          </Button>
        </CardFooter>
      </Card>

      {/* Clipboard History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Local Clipboard History</h2>
        {isLoading ? (
           // Skeleton Loading State
           <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
           </div>
        ) : clipboardItems.length === 0 ? (
           // Empty State
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Your local clipboard is empty. Add some items above!</p>
            </CardContent>
          </Card>
        ) : (
           // Items List
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-card">
             <p className="sr-only">List of clipboard items</p>
            <div className="space-y-4">
              {clipboardItems.map((item) => (
                <Card key={item.id} className="shadow-sm transition-all hover:shadow-md overflow-hidden">
                   {/* Item Header */}
                   <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-muted/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                         {getItemIcon(item.type)}
                         <span className="capitalize">{item.type}</span>
                     </div>
                     {/* Timestamp */}
                     <span className="text-xs text-muted-foreground">
                        {item.createdAt instanceof Date ? item.createdAt.toLocaleString() : 'Just now'}
                    </span>
                  </CardHeader>
                   {/* Item Content */}
                  <CardContent className="p-4 max-h-48 overflow-y-auto"> {/* Limit height, allow scroll */}
                    {renderItemContent(item)}
                  </CardContent>
                   {/* Item Actions Footer */}
                  <CardFooter className="flex justify-end gap-2 py-2 px-4 border-t bg-muted/50">
                    {/* Copy Button */}
                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(item)} title={`Copy ${item.type}`} disabled={isProcessing}>
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy {item.type}</span>
                    </Button>
                    {/* Delete Button */}
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
