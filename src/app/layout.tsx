import type { Metadata, Viewport } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { SUPABASE_STORAGE_URL } from '@/config/constants';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'VORA Energia IA - Assistente Inteligente',
  description: 'Assistente de IA especializado em gestão de energia para gestores',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: `${SUPABASE_STORAGE_URL}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${SUPABASE_STORAGE_URL}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: `${SUPABASE_STORAGE_URL}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VORA Energia IA',
  },
};

export const viewport: Viewport = {
  themeColor: '#00D87A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={nunitoSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
