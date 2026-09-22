import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter, Noto_Sans_Ethiopic, Playfair_Display } from 'next/font/google';

import '@/styles/globals.css';
import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ThemeScript } from '@/components/site/ThemeScript';
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen';
import { currentUser, isStaff } from '@/lib/auth';
import { getCartSummary } from '@/lib/cart';
import { getCategories } from '@/lib/catalogue';
import { savedCount } from '@/lib/wishlist';
import { getBanners } from '@/lib/site/banners';
import { getPublishedSettings } from '@/lib/site/settings';
import { buildThemeCss } from '@/lib/site/theme-css';

// next/font downloads these at build time and serves them from our own origin,
// so a visitor in Addis makes no request to Google and the page cannot be
// blocked by someone else's CDN going dark.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// The brand voice. Playfair's high stroke contrast is what makes a furniture
// headline read as a gallery label rather than a product listing.
// No weight list: Playfair Display is a variable font, and naming weights
// forces next/font to cut a separate static file for each one. Eight files
// (four weights, two styles) came to 88kB; the variable pair covers every
// weight the theme editor can ask for in two.
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-playfair',
});

// Neither Latin face has Ethiopic coverage. Without this, every Amharic word
// on the site renders in whatever the device happens to have installed.
// Ethiopic carries several hundred glyphs, so each static weight is large —
// four of them were 194kB, fetched on every page for a line in the footer.
// This is a variable font too, so the whole weight range costs one file.
const ethiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  display: 'swap',
  // Not preloaded. The Ethiopic block is several hundred glyphs and this file
  // is 198kB — bigger than all three Latin faces together, and bigger than
  // every script on the page. The Amharic it renders is a line in the footer
  // and the second line of a category name: real, worth having, and never the
  // thing somebody is waiting to read. Preloading it put 198kB in front of
  // the first paint of every page. It is fetched when it is needed instead,
  // and display: swap means the words are on screen before it lands.
  preload: false,
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
    // Left out entirely when the shop has not uploaded one, so Next falls back
    // to the icon in /app, which is the icon the site shipped with.
    icons: seo.faviconUrl ? { icon: seo.faviconUrl, shortcut: seo.faviconUrl, apple: seo.faviconUrl } : undefined,
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
  // Everything the chrome needs, in one round of queries rather than five
  // sequential ones. Each falls back on its own if the database is unreachable,
  // so a blip takes out a number in the header rather than the whole site.
  const [user, cart, settings, announcements, headerList, categories, saved] = await Promise.all([
    currentUser(),
    getCartSummary(),
    getPublishedSettings(),
    getBanners('ANNOUNCEMENT'),
    headers(),
    getCategories().catch(() => []),
    savedCount(),
  ]);

  const { store, theme, typography, buttons, seo, social, header, animations } = settings;
  const nav = settings['nav.header'];

  // Closed to the public, open to whoever is running it. The check is here,
  // on the server, in the layout every public route passes through — not in
  // middleware, which cannot reach the database, and not in a client component,
  // where "am I staff" would be the browser's opinion.
  // /login and /admin are never covered: the way back in has to stay open, and
  // the admin does its own far stricter check on every page anyway.
  const pathname = headerList.get('x-pathname') ?? '';
  const inAdmin = pathname.startsWith('/admin');
  const alwaysOpen = pathname.startsWith('/login') || inAdmin;
  const closed = store.maintenanceMode && !isStaff(user) && !alwaysOpen;

  // Emitted after tokens.css, so anything the admin has not set keeps the
  // stylesheet's own value. A shop on the defaults ships a handful of lines.
  const themeCss = buildThemeCss({ theme, typography, buttons, animations });

  // Only what Store Settings actually holds. A blank field is left out rather
  // than sent as an empty string, which Google reads as a claim that the shop
  // has no opening hours at all.
  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: store.name,
    ...(store.workshopName ? { alternateName: [store.workshopName, store.nameAm].filter(Boolean) } : {}),
    description: seo.defaultDescription,
    url: siteUrl,
    ...(store.phone ? { telephone: store.phone } : {}),
    ...(store.email ? { email: store.email } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.area,
      addressLocality: store.city,
      addressCountry: store.country,
    },
    ...(store.latitude !== 0 || store.longitude !== 0
      ? { geo: { '@type': 'GeoCoordinates', latitude: store.latitude, longitude: store.longitude } }
      : {}),
    ...(store.mapsUrl ? { hasMap: store.mapsUrl } : {}),
    ...(store.openingHours ? { openingHours: store.openingHours } : {}),
    currenciesAccepted: store.currency,
    sameAs: social.links.filter((l) => l.isVisible && l.url).map((l) => l.url),
  };

  return (
    <html
      lang="en"
      // The stylesheet sets scroll-behavior: smooth on <html>. Next.js turns it
      // off during route changes only when this attribute says so; without it
      // Next 15.5 warns that the automatic workaround is going away.
      data-scroll-behavior="smooth"
      data-theme={theme.defaultTheme === 'system' ? undefined : theme.defaultTheme}
      className={`${inter.variable} ${playfair.variable} ${ethiopic.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* React hoists this into <head> itself and dedupes it by href.
            Written this way rather than as a hand-rolled <head> element for
            one concrete reason: a browser extension that injects its own
            <style> at the top of <head> — and plenty do — shifts what React
            finds where it expected ours, and hydration fails on every page of
            the site at once. Letting React own the hoisting makes that a
            non-event. buildThemeCss emits no character React would escape,
            which is why this can be plain text. */}
        <style href="warka-theme" precedence="high">
          {themeCss}
        </style>
        <ThemeScript fallback={theme.defaultTheme} />
        {inAdmin ? (
          // The admin brings its own shell. Wrapping a tool in the shop's
          // header and footer gives it a second navigation that goes nowhere
          // useful and a footer full of links for customers.
          children
        ) : closed ? (
          <MaintenanceScreen
            name={store.name}
            nameAm={store.nameAm}
            message={store.maintenanceMessage}
            phone={store.phone}
            phoneHref={store.phoneHref}
          />
        ) : (
          <>
            <a className="skip-link" href="#main">
              Skip to the content
            </a>
            {announcements[0] && <AnnouncementBar banner={announcements[0]} />}
            <SiteHeader
              user={user}
              cartCount={cart.count}
              savedCount={saved}
              categories={categories}
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
          </>
        )}
      </body>
    </html>
  );
}
