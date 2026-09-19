import { Hero } from '@/components/hero/Hero';
import { BrandStory } from '@/components/sections/BrandStory';
import { CategoryStrip } from '@/components/sections/CategoryStrip';
import { ProductCarousel } from '@/components/sections/ProductCarousel';
import { ProductStrip } from '@/components/sections/ProductStrip';
import { Offers } from '@/components/sections/Offers';
import { Quote } from '@/components/sections/Quote';
import { Section } from '@/components/sections/Section';
import { StorePanel } from '@/components/sections/StorePanel';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import {
  getCategories,
  getFeaturedProducts,
  getNewestProducts,
  getPhotographedProducts,
} from '@/lib/catalogue';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import { getOffers, hasOffers } from '@/lib/offers';
import { getShop } from '@/lib/site/shop';
import { HOME_QUOTE, HOME_VISIT } from '@/lib/site/home-defaults';
import { savedVariantIds } from '@/lib/wishlist';

export const revalidate = 300;

export default async function HomePage() {
  // If the shop has built and published a homepage in the Website Builder,
  // that is the homepage. Otherwise the one below stands — so the site has a
  // homepage from the first minute, and gains an editable one the moment
  // somebody wants it.
  // Optional by nature: "has someone built a homepage?" If the database
  // cannot answer, that is not a reason to fail here — fall through and let
  // the queries below report the real problem.
  const built = await db.page
    .findFirst({ where: { slug: 'home', status: 'PUBLISHED' } })
    .catch(() => null);

  if (built?.publishedBlocks) {
    const blocks = parseBlocks(built.publishedBlocks);
    if (blocks.length > 0) return <BlockRenderer blocks={blocks} />;
  }

  const [shop, categories, featured, newest, photographed, saved, offers] = await Promise.all([
    getShop(),
    getCategories(),
    getFeaturedProducts(8),
    getNewestProducts(8),
    getPhotographedProducts(1),
    savedVariantIds(),
    getOffers(4),
  ]);

  // The hero leads with a real photograph when the shop has one, and with the
  // typographic plate when it does not. Neither is a placeholder.
  const lead = photographed[0];

  // "Featured" is a flag the admin sets. When nothing is flagged yet, the
  // shelf shows what has actually been photographed rather than sitting empty
  // or inventing a reason a piece is special.
  const shelf = featured.length > 0 ? featured : await getPhotographedProducts(8);
  const shelfHeading = featured.length > 0 ? 'Featured pieces' : 'On the floor now';

  return (
    <>
      <Hero
        panel={lead?.imageUrl ? 'image' : 'plate'}
        imageUrl={lead?.imageUrl ?? ''}
        imageAlt={lead?.imageAlt ?? ''}
      />

      <Section id="categories" labelledBy="categories-heading">
        <CategoryStrip
          categories={categories}
          kicker="Every room"
          headingId="categories-heading"
          linkLabel="All {count} pieces"
          linkHref="/shop"
        />
      </Section>

      <Section labelledBy="featured-heading">
        <ProductStrip
          products={shelf}
          kicker="Photographed in the workshop"
          heading={shelfHeading}
          headingId="featured-heading"
          linkLabel="Browse everything"
          linkHref="/shop"
          priorityCount={4}
          savedIds={saved}
          emptyLabel="Nothing is photographed yet. The catalogue is still the place to look."
        />
      </Section>

      {newest.length > 0 && (
        <Section labelledBy="new-heading" flush>
          <ProductCarousel
            products={newest}
            kicker="Latest from the workshop"
            heading="New arrivals"
            headingId="new-heading"
            linkLabel="See the catalogue"
            linkHref="/shop"
            visibleDesktop={4}
            visibleMobile={1.35}
            savedIds={saved}
          />
        </Section>
      )}

      {/* Only when the shop has actually configured something. getOffers reads
          sale prices, coupons and delivery zones; it invents nothing, and
          hasOffers is false on a shop that has set none of them — in which
          case no band renders at all. */}
      {hasOffers(offers) && (
        <Section labelledBy="offers-heading">
          <h2 id="offers-heading" className="sr-only">
            Current offers
          </h2>
          <Offers offers={offers} savedIds={saved} />
        </Section>
      )}

      <div className="band">
        <Section labelledBy="brand-heading">
          <BrandStory
            kicker="Warka Furniture"
            heading="Built to your measurement, in Kebena."
            headingId="brand-heading"
            body={shop.tagline || undefined}
            points={[
              {
                icon: 'ruler',
                title: 'Made to size',
                body: 'Beds and tables are built to the measurement you bring in, not to a fixed catalogue size.',
              },
              {
                icon: 'sparkle',
                title: 'You pick the board',
                body: 'The same piece in white melamine or grey marble laminate, chosen when you order.',
              },
              {
                icon: 'truck',
                title: 'Delivered in Addis',
                body: shop.deliveryNote,
              },
            ]}
            imageUrl={HOME_VISIT.imageUrl}
            imageAlt={HOME_VISIT.imageAlt}
            linkLabel="How we build"
            linkHref="/craft"
          />
        </Section>
      </div>

      <Quote text={HOME_QUOTE} label="About the name" />

      <Section id="visit" labelledBy="visit-heading">
        <StorePanel
          kicker="Come and see"
          heading="Visit the workshop"
          headingId="visit-heading"
          body={HOME_VISIT.body}
          imageUrl={lead?.imageUrl ?? HOME_VISIT.imageUrl}
          imageAlt={lead?.imageAlt ?? HOME_VISIT.imageAlt}
          details={[
            { label: 'Shop', value: shop.area },
            { label: 'Open', value: shop.openingHours },
            { label: 'Phone', value: shop.phone, href: `tel:${shop.phoneHref}` },
            { label: 'Delivery', value: shop.deliveryNote },
          ]}
          primaryLabel="See the pieces"
          primaryHref="/shop"
          secondaryLabel="Ask a question"
          secondaryHref="/contact"
        />
      </Section>
    </>
  );
}
