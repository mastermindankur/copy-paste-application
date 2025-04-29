import type { Metadata } from 'next';
import { Geist_Sans as Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CrossClip',
  description: 'Seamless clipboard sharing across devices.',
};

// Create a client
const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} antialiased`,
          'flex flex-col min-h-screen'
        )}
      >
         <QueryClientProvider client={queryClient}>
           <Header />
           <main className="flex-grow container mx-auto px-4 py-8">
             {children}
           </main>
           <Toaster />
         </QueryClientProvider>
      </body>
    </html>
  );
}
