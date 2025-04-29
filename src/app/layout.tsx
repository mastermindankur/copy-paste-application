
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Import Inter from next/font/google
import './globals.css';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import Providers from './providers'; // Import the new client provider component

// Instantiate Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Use a standard variable name like --font-sans
});

export const metadata: Metadata = {
  title: 'CrossClip',
  description: 'Seamless clipboard sharing across devices.',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          `${inter.variable} font-sans antialiased`, // Apply the font variable and a base font class
          'flex flex-col min-h-screen'
        )}
      >
         {/* Wrap the content with the client-side Providers component */}
         <Providers>
           <Header />
           <main className="flex-grow container mx-auto px-4 py-8">
             {children}
           </main>
           {/* Toaster remains inside Providers to access context if needed */}
         </Providers>
      </body>
    </html>
  );
}
