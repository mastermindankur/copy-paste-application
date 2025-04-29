'use client';

import React from 'react';
import Link from 'next/link';
import { ClipboardCopy } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCopy className="h-6 w-6 text-accent" />
          {/* Ensure text color contrasts with card background */}
          <span className='text-card-foreground'>CrossClip</span>
        </Link>

         {/* Placeholder for potential future header elements */}
         <div></div>
      </div>
    </header>
  );
}
