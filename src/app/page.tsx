import { Hero } from '@/components/hero/Hero';
import { BrandStory } from '@/components/sections/BrandStory';
import { FurnitureShowcase } from '@/components/sections/FurnitureShowcase';
import { Offers } from '@/components/sections/Offers';
import { Quote } from '@/components/sections/Quote';
import { Section } from '@/components/sections/Section';
import { StorePanel } from '@/components/sections/StorePanel';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import { getOffers, hasOffers } from '@/lib/offers';
import { getShop } from '@/lib/site/shop';
import { HOME_QUOTE } from '@/lib/site/home-defaults';

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

  const [shop, configuredOffers] = await Promise.all([getShop(), getOffers(4)]);

  // The homepage does not carry a delivery card. Free-delivery zones are still
  // configured in the admin, still priced at checkout, and the pin still picks
  // the area — that is untouched. It is simply not advertised here, so the
  // offers band is dropped to what is left. When free delivery was the only
  // offer configured, hasOffers below is now false and no band renders at all,
  // which is right: there is nothing else to say.
  // Nor a "reduced" strip: the sale prices still apply in the shop and on
  // each card, but the homepage makes no weekly promotional claim.
  const offers = { ...configuredOffers, freeDelivery: null, reduced: null };

  return (
    <>
      {/* The plate, always. The hero used to show whichever product happened to
          be photographed; it now carries the Warka name, the Amharic and the
          note about the sycamore fig, which is the shop's own identity rather
          than a piece of stock. */}
      <Hero panel="plate" />

      <Section id="furniture" labelledBy="furniture-heading">
        <FurnitureShowcase
          kicker="What we make"
          heading="Furniture Made for Your Space"
          headingId="furniture-heading"
          body="Designed for comfort, built with care, and made to bring character to your home."
          images={[
            {
              src: '/marketing/warka-wood-works.jpg',
              alt: 'Warka Wood Works — Industrial: a fitted white kitchen being installed by the workshop team, with wardrobes, kitchen cabinets and wooden doors shown below',
            },
            {
              src: '/marketing/warka-collection.jpg',
              alt: 'Warka Wood Works — Industrial: a fitted kitchen, a wardrobe and a panelled wooden door made by the workshop',
            },
          ]}
          services={['Furniture', 'Kitchen furniture', 'Doors', 'Custom woodwork']}
          linkLabel="Browse everything"
          linkHref="/shop"
        />
      </Section>

      {/* Only when the shop has actually configured something. getOffers reads
          sale prices, coupons and delivery zones; it invents nothing, and
          hasOffers is false on a shop that has set none of them — in which
          case no band renders at all. */}
      {hasOffers(offers) && (
        <Section labelledBy="offers-heading">
          <h2 id="offers-heading" className="sr-only">
            Current offers
          </h2>
          <Offers offers={offers} />
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
          details={[
            { label: 'Shop', value: shop.area, href: shop.mapsUrl || undefined },
            { label: 'More information', value: shop.phone, href: `tel:${shop.phoneHref}` },
            { label: 'Direct orders', value: shop.orderPhone, href: `tel:${shop.orderPhoneHref}` },
            { label: 'Email', value: shop.email, href: `mailto:${shop.email}` },
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
