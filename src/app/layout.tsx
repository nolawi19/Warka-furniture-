import type { Metadata, Viewport } from 'next';
import { Archivo, Instrument_Serif, Noto_Sans_Ethiopic } from 'next/font/google';

import '@/styles/globals.css';
import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ThemeScript } from '@/components/site/ThemeScript';
import { currentUser } from '@/lib/auth';
import { getCartSummary } from '@/lib/cart';
import { getBanners } from '@/lib/site/banners';
import { getPublishedSettings } from '@/lib/site/settings';
import { buildThemeCss } from '@/lib/site/theme-css';

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

/**
 * Title, description, keywords and indexing all come from Admin -> SEO now.
 * Until anything is published there, the schema defaults are the exact strings
 * that used to be hardcoded here, so the metadata does not change.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublishedSettings();
  const { seo, store } = settings;
  const canonicalBase = seo.canonicalHost.trim() || siteUrl;

  return {
    metadataBase: new URL(canonicalBase),
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate.includes('%s') ? seo.titleTemplate : `%s · ${store.name}`,
    },
    description: seo.defaultDescription,
    applicationName: store.name,
    keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
    openGraph: {
      type: 'website',
      locale: 'en_ET',
      siteName: store.name,
      url: canonicalBase,
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    // One switch takes the whole site out of the index. It is in the admin
    // because "we are not ready to be found yet" is a normal thing to want.
    robots: seo.allowIndexing
      ? { index: true, follow: true }
      : { index: false, follow: false },
    alternates: { canonical: '/' },
  };
}

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
  const [user, cart, settings, announcements] = await Promise.all([
    currentUser(),
    getCartSummary(),
    getPublishedSettings(),
    getBanners('ANNOUNCEMENT'),
  ]);

  const { store, theme, typography, buttons, seo, social, footer, header } = settings;
  const nav = settings['nav.header'];

  // Emitted after tokens.css, so anything the admin has not set keeps the
  // stylesheet's own value. A shop on the defaults ships a handful of lines.
  const themeCss = buildThemeCss({ theme, typography, buttons });

  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: store.name,
    description: seo.defaultDescription,
    url: siteUrl,
    telephone: store.phone,
    email: store.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.area,
      addressLocality: store.city,
      addressCountry: store.country,
    },
    openingHours: store.openingHours,
    currenciesAccepted: store.currency,
    sameAs: social.links.filter((l) => l.isVisible && l.url).map((l) => l.url),
  };

  return (
    <html
      lang="en"
      data-theme={theme.defaultTheme === 'system' ? undefined : theme.defaultTheme}
      className={`${archivo.variable} ${instrument.variable} ${ethiopic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="warka-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>
        <ThemeScript fallback={theme.defaultTheme} />
        <a className="skip-link" href="#main">
          Skip to the content
        </a>
        {announcements[0] && <AnnouncementBar banner={announcements[0]} />}
        <SiteHeader
          user={user}
          cartCount={cart.count}
          nav={nav.items}
          settings={header}
          store={store}
        />
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
