import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DocSetuAI', template: '%s | DocSetuAI' },
  description: 'Autonomous AI Business Operations Platform — Turn business goals into completed work.',
  keywords: ['AI', 'autonomous agents', 'business automation', 'payment recovery'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
