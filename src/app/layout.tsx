import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, Geist_Mono } from 'next/font/google';
import './globals.css';

// Las mismas familias que netgym: el cliente ya reconoce ese lenguaje visual.
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Club de Pescadores San Rafael',
  description: 'Gestión de socios, predios y accesos del Club de Pescadores San Rafael.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ED3237',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${hanken.variable} ${geistMono.variable} antialiased`}
        style={{ ['--font-headline' as string]: 'var(--font-body)' }}
      >
        {children}
      </body>
    </html>
  );
}
