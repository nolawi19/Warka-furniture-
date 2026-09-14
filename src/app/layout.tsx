import type { Metadata, Viewport } from 'next';
import { Archivo, Instrument_Serif, Noto_Sans_Ethiopic } from 'next/font/google';

import '@/styles/globals.css';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ThemeScript } from '@/components/site/ThemeScript';
import { currentUser } from '@/lib/auth';
import { getCartSummary } from '@/lib/cart';
import { SHOP } from '@/lib/shop-details';

// next/font downloads these at build time and serves them from our own origin,
// so a visitor in Addis makes no request to Google and the page cannot be
// blocked by someone else's CDN going dark.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
  variable: '--font-instrument',
});

// Archivo has no Ethiopic coverage. Without this, every Amharic word on the
// site renders in whatever the device happens to have installed.
const ethiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ethiopic',
});

const siteUrl = process.env.APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Warka Furniture — beds, dressing tables and drawers made in Addis Ababa',
    template: '%s · Warka Furniture',
  },
  description:
    'Warka Furniture builds buttoned beds, dressing tables, mirrors, chests of drawers and office pedestals to your measurement in Addis Ababa.',
  applicationName: 'Warka Furniture',
  keywords: [
    'furniture Addis Ababa',
    'buttoned bed Ethiopia',
    'dressing table Addis',
    'chest of drawers Ethiopia',
    'made to measure furniture',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_ET',
    siteName: 'Warka Furniture',
    url: siteUrl,
    title: 'Warka Furniture — made to your measurement in Addis Ababa',
    description:
      'Buttoned beds, dressing tables, mirrors, chests and pedestals, in the board and the colour you pick.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Never disable zoom. Pinch-to-zoom is an accessibility feature, not a bug.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2ed' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0c0a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, cart] = await Promise.all([currentUser(), getCartSummary()]);

  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: 'Warka Furniture',
    description:
      'Beds, dressing tables, mirrors, chests of drawers and office furniture, made to measure in Addis Ababa.',
    url: siteUrl,
    telephone: SHOP.phone,
    email: SHOP.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SHOP.area,
      addressLocality: 'Addis Ababa',
      addressCountry: 'ET',
    },
    openingHours: SHOP.openingHours,
    currenciesAccepted: 'ETB',
  };

  return (
    <html
      lang="en"
      data-theme="light"
      className={`${archivo.variable} ${instrument.variable} ${ethiopic.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        <a className="skip-link" href="#main">
          Skip to the content
        </a>
        <SiteHeader user={user} cartCount={cart.count} />
        <main id="main">{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }}
        />
      </body>
    </html>
  );
}
