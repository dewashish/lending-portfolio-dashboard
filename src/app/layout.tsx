import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import { ThemeRegistry } from '@/components/shell/ThemeRegistry';
import { UserProvider } from '@/lib/user-context';
import { SessionHeartbeat } from '@/components/shell/SessionHeartbeat';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Avalora Portfolio Monitor',
  description: 'Group-level portfolio quality monitoring across consumer, trade, and corporate finance',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <ThemeRegistry>
          <UserProvider>
            <SessionHeartbeat />
            {children}
          </UserProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
