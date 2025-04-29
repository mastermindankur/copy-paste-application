
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Clipboard, FileText, Image as ImageIcon, Trash2, Upload, Copy, Link as LinkIcon, Code } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from './ui/skeleton'; // Keep Skeleton for initial loading state

// Define a clipboard item structure that can handle rich text (HTML)
interface ClipboardItemData {
  id: string;
  type: 'text' | 'url' | 'html'; // Added 'html' type
  content: string; // Plain text content or URL
  htmlContent?: string; // Optional HTML content
  createdAt: Date;
}

export default function ClipboardManager() {
  const [textInput, setTextInput] = useState('');
  const [htmlInput, setHtmlInput] = useState<string | undefined>(undefined); // State for potential HTML from paste
  const [clipboardItems, setClipboardItems] = useState<ClipboardItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading true
  const [isProcessing, setIsProcessing] = useState(false); // Generic processing state

  // Basic URL validation
  const isValidUrl = (string: string): boolean => {
      try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch (_) {
        return false;
      }
  }

  const handleAddItem = async () => {
    if (isProcessing || !textInput.trim()) return; // Prevent multiple adds or empty adds

    setIsProcessing(true);
    let type: ClipboardItemData['type'] = 'text';
    if (isValidUrl(textInput)) {
        type = 'url';
    } else if (htmlInput) {
        // If we have specific HTML content from the paste, mark it as HTML type
        type = 'html';
    }

    const newItem: ClipboardItemData = {
      id: crypto.randomUUID(),
      type: type,
      content: textInput, // Always store plain text
      htmlContent: type === 'html' ? htmlInput : undefined, // Store HTML only if it's the primary type
      createdAt: new Date(),
    };

    // Simulate async operation if needed
    await new Promise(resolve => setTimeout(resolve, 50));

    setClipboardItems(prevItems => [newItem, ...prevItems]);
    setTextInput('');
    setHtmlInput(undefined); // Clear HTML input after adding
    toast({ title: 'Success', description: `${type.toUpperCase()} added to clipboard.` });
    setIsProcessing(false);
  };

   const handlePasteFromClipboard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
        // Check for ClipboardItem interface support
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
                        setHtmlInput(html); // Store HTML content
                        // We still need plain text, try to get it too or fallback later
                         if (item.types.includes('text/plain')) {
                             const plainBlob = await item.getType('text/plain');
                             setTextInput(await plainBlob.text());
                             foundText = true;
                         } else {
                             // Fallback: Use a simple conversion (might lose formatting)
                             // Or, you could parse the HTML to extract text, but that's complex.
                             // For simplicity, let's just use the HTML as the plain text fallback here.
                             setTextInput(html);
                             foundText = true;
                         }
                        foundHtml = true;
                        break; // Prioritize HTML if available
                    } catch (err) {
                        console.error("Error reading HTML from clipboard:", err);
                        // Fall through to try plain text
                    }
                } else if (item.types.includes('text/plain') && !foundHtml) {
                     try {
                        const blob = await item.getType('text/plain');
                        const text = await blob.text();
                        setTextInput(text);
                        setHtmlInput(undefined); // Ensure no stale HTML
                        foundText = true;
                        break; // Found plain text, stop looking if HTML wasn't found
                    } catch (err) {
                        console.error("Error reading plain text from clipboard:", err);
                    }
                }
            }

            if (foundText || foundHtml) {
                 toast({ title: 'Pasted', description: `Pasted ${foundHtml ? 'rich text (HTML)' : 'plain text'} from clipboard.` });
            } else {
                 toast({ title: 'Empty or Unsupported', description: 'No text or HTML found in clipboard.', variant: 'default' });
            }

        } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
             // Fallback for browsers not supporting clipboard.read() fully
            const clipboardContent = await navigator.clipboard.readText();
            if (clipboardContent) {
                setTextInput(clipboardContent);
                setHtmlInput(undefined); // Ensure no stale HTML
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
         toast({ title: 'Permission Denied', description: 'Clipboard access was denied. Please grant permission in your browser settings.', variant: 'destructive' });
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
     await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
     setClipboardItems(prevItems => prevItems.filter(item => item.id !== id));
     toast({ title: 'Deleted', description: 'Item removed from clipboard.' });
     setIsProcessing(false);
  };

  const handleCopyToClipboard = async (item: ClipboardItemData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
        if (item.type === 'html' && item.htmlContent && navigator.clipboard.write) {
            const plainTextBlob = new Blob([item.content], { type: 'text/plain' });
            const htmlBlob = new Blob([item.htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({
                'text/plain': plainTextBlob,
                'text/html': htmlBlob,
            });
            await navigator.clipboard.write([clipboardItem]);
            toast({ title: 'Copied!', description: 'Rich text (HTML) copied.' });
        } else {
            // Fallback to plain text if type is not HTML, no HTML content, or write API unavailable
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
         // WARNING: Rendering arbitrary HTML is risky. Only do this because
         // the content is assumed to be from the user's own clipboard actions within this app.
         // In a real-world scenario, SANITIZE this HTML before rendering.
         return (
            <div
               className="text-sm prose prose-sm dark:prose-invert max-w-none" // Basic prose styling
               dangerouslySetInnerHTML={{ __html: item.htmlContent || item.content }} // Fallback to plain text if HTML is somehow missing
            />
         );
      case 'url':
        const href = item.content.startsWith('http://') || item.content.startsWith('https://') ? item.content : `https://${item.content}`;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
            {item.content}
          </a>
        );
      default:
        return <p className="text-sm text-muted-foreground">Unsupported item type</p>;
    }
  };

  const getItemIcon = (type: ClipboardItemData['type']) => {
     switch (type) {
        case 'text': return <Clipboard className="h-5 w-5"/>;
        case 'html': return <Code className="h-5 w-5" />; // Use Code icon for HTML
        case 'url': return <LinkIcon className="h-5 w-5" />;
        default: return <Clipboard className="h-5 w-5"/>;
     }
  }

   // Simulate loading finish
   useEffect(() => {
     const timer = setTimeout(() => setIsLoading(false), 300); // Simulate loading delay
     return () => clearTimeout(timer);
   }, []);

  // Main component UI
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Add to Clipboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
             <Textarea
                placeholder="Paste or type text, HTML, or URL here..."
                value={textInput}
                onChange={(e) => {
                    setTextInput(e.target.value);
                    // If user types, assume it's plain text and clear potential pasted HTML
                    if (htmlInput) {
                        setHtmlInput(undefined);
                    }
                }}
                rows={5} // Increase default rows
                className="pr-12 resize-y" // Allow vertical resize, remove resize-none
                disabled={isProcessing}
             />
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
          <Button
            onClick={handleAddItem}
            disabled={isProcessing || !textInput.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
           >
            <Upload className="mr-2 h-4 w-4" /> {isProcessing ? 'Adding...' : 'Add Item'}
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
              <p className="text-muted-foreground text-center">Your clipboard is empty. Add some items above!</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-card">
             <p className="sr-only">List of clipboard items</p>
            <div className="space-y-4">
              {clipboardItems.map((item) => (
                <Card key={item.id} className="shadow-sm transition-all hover:shadow-md overflow-hidden"> {/* Added overflow-hidden */}
                   <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-muted/50"> {/* Subtle bg */}
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                         {getItemIcon(item.type)}
                         <span className="capitalize">{item.type}</span>
                     </div>
                     <span className="text-xs text-muted-foreground">
                        {item.createdAt?.toLocaleString() ?? 'Just now'}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 max-h-48 overflow-y-auto"> {/* Limit height and allow scroll within card */}
                    {renderItemContent(item)}
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 py-2 px-4 border-t bg-muted/50"> {/* Subtle bg */}
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
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
