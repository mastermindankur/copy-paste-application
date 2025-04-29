
'use client'; // Keep client-side for ClipboardManager

import ClipboardManager from '@/components/clipboard-manager';
// Removed imports related to sharing: useState, useRouter, Button, Loader2, Share, toast, Card components

export default function Home() {
  // Removed state and handler for creating collection

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-semibold mb-2">
          CrossClip
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your local clipboard history. Add text, URLs, or rich text. Items are stored temporarily in this browser session only.
        </p>
      </div>

      {/* Local Clipboard Section */}
      <div className="w-full max-w-3xl">
        <ClipboardManager />
      </div>

      {/* Removed Shared Collection Section */}
    </div>
  );
}
