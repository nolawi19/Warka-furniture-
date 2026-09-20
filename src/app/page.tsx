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

  const [shop, categories, featured, newest, photographed, saved, configuredOffers] =
    await Promise.all([
      getShop(),
      getCategories(),
      getFeaturedProducts(8),
      getNewestProducts(8),
      getPhotographedProducts(1),
      savedVariantIds(),
      getOffers(4),
    ]);

  // The homepage does not carry a delivery card. Free-delivery zones are still
  // configured in the admin, still priced at checkout, and the pin still picks
  // the area — that is untouched. It is simply not advertised here, so the
  // offers band is dropped to what is left. When free delivery was the only
  // offer configured, hasOffers below is now false and no band renders at all,
  // which is right: there is nothing else to say.
  const offers = { ...configuredOffers, freeDelivery: null };

  // The hero leads with a real photograph when the shop has one, and with the
  // typographic plate when it does not. Neither is a placeholder.
  const lead = photographed[0];

  // "Featured" is a flag the admin sets. When nothing is flagged yet, the
  // shelf shows what has actually been photographed rather than sitting empty
  // or inventing a reason a piece is special.
  const shelf = featured.length > 0 ? featured : await getPhotographedProducts(8);
  const shelfHeading = featured.length > 0 ? 'Designed for Beautiful Living' : 'On the floor now';

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
          kicker="Shop by category"
          heading="Find Furniture You'll Love"
          headingId="categories-heading"
          linkLabel="All {count} pieces"
          linkHref="/shop"
        />
      </Section>

      {/* priorityCount is 0 on purpose: the hero photograph is the largest
          thing on the first screen and the only image worth preloading. These
          cards sit below the fold at every width, and marking them priority
          put four more images in front of the hero on a phone connection. */}
      <Section labelledBy="featured-heading">
        <ProductStrip
          products={shelf}
          kicker="Our furniture collection"
          heading={shelfHeading}
          body="Explore our carefully selected furniture pieces, created for comfort, style, and everyday living."
          headingId="featured-heading"
          linkLabel="Browse everything"
          linkHref="/shop"
          priorityCount={0}
          savedIds={saved}
          emptyLabel="Nothing is photographed yet. The catalogue is still the place to look."
        />
      </Section>

      {newest.length > 0 && (
        <Section labelledBy="new-heading" flush>
          <ProductCarousel
            products={newest}
            kicker="New arrivals"
            heading="Something New for Your Space"
            body="Discover our latest furniture and bring a fresh look to your home."
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
            kicker="Why Warka Furniture?"
            heading="Your Home. Your Style. Your Warka."
            headingId="brand-heading"
            body="Create spaces that feel warm, comfortable, elegant, and uniquely yours."
            points={[
              {
                icon: 'sparkle',
                title: 'Beautiful Design',
                body: 'Modern furniture made to stand out.',
              },
              {
                icon: 'heart',
                title: 'Comfort You Can Feel',
                body: 'Designed for relaxing, living, and enjoying your space.',
              },
              {
                icon: 'ruler',
                title: 'Quality & Detail',
                body: 'Thoughtfully crafted with attention to every detail.',
              },
              {
                icon: 'shield',
                title: 'Timeless Style',
                body: 'Furniture made to complement your home for years to come.',
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
          heading="Make Your Space Beautiful"
          headingId="visit-heading"
          body="Find the furniture that belongs in your home."
          imageUrl={lead?.imageUrl ?? HOME_VISIT.imageUrl}
          imageAlt={lead?.imageAlt ?? HOME_VISIT.imageAlt}
          details={[
            { label: 'Shop', value: shop.area },
            { label: 'Open', value: shop.openingHours },
            { label: 'Phone', value: shop.phone, href: `tel:${shop.phoneHref}` },
            { label: 'Delivery', value: shop.deliveryNote },
          ]}
          primaryLabel="Shop Warka Furniture"
          primaryHref="/shop"
          secondaryLabel="Ask a question"
          secondaryHref="/contact"
        />
      </Section>
    </>
  );
}
