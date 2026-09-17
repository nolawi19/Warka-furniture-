import { Hero } from '@/components/hero/Hero';
import { CategoryStrip } from '@/components/sections/CategoryStrip';
import { ProductStrip } from '@/components/sections/ProductStrip';
import { Quote } from '@/components/sections/Quote';
import { Section } from '@/components/sections/Section';
import { Steps } from '@/components/sections/Steps';
import { StorePanel } from '@/components/sections/StorePanel';
import { getCategories, getPhotographedProducts } from '@/lib/catalogue';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import { getShop } from '@/lib/site/shop';
import { HOME_STEPS, HOME_QUOTE, HOME_VISIT } from '@/lib/site/home-defaults';

export const revalidate = 300;

export default async function HomePage() {
  // If the shop has built and published a homepage in the Website Builder,
  // that is the homepage. Otherwise the original one below stands — so the
  // site has a homepage from the first minute, and gains an editable one the
  // moment somebody wants it.
  // Optional by nature: "has someone built a homepage?" If the database
  // cannot answer, that is not a reason to fail here — fall through to the
  // original homepage below and let its own queries report the real problem.
  const built = await db.page
    .findFirst({ where: { slug: 'home', status: 'PUBLISHED' } })
    .catch(() => null);

  if (built?.publishedBlocks) {
    const blocks = parseBlocks(built.publishedBlocks);
    if (blocks.length > 0) return <BlockRenderer blocks={blocks} />;
  }

  const SHOP = await getShop();
  const [categories, showroom] = await Promise.all([
    getCategories(),
    getPhotographedProducts(6),
  ]);

  const pieceCount = categories.reduce((n, c) => n + c.pieceCount, 0);

  // Every section below is the same component the Website Builder renders for
  // the matching block. There is no second homepage design to keep in step.
  return (
    <>
      <Hero />

      <Section id="categories" labelledBy="categories-heading">
        <CategoryStrip
          categories={categories}
          headingId="categories-heading"
          linkLabel={`All ${pieceCount} pieces`}
          linkHref="/shop"
        />
      </Section>

      <Section labelledBy="showroom-heading">
        <ProductStrip
          products={showroom}
          kicker="Photographed in the workshop"
          heading="On the floor now"
          headingId="showroom-heading"
          linkLabel="Browse everything"
          linkHref="/shop"
          priorityCount={3}
          emptyLabel="Nothing is photographed yet. The catalogue is still the place to look."
        />
      </Section>

      <Section labelledBy="how-heading">
        <Steps steps={HOME_STEPS} heading="How you buy it" headingId="how-heading" note={SHOP.area} />
      </Section>

      <Quote text={HOME_QUOTE} label="About the name" />

      <Section id="visit" labelledBy="visit-heading">
        <StorePanel
          heading="Visit the workshop"
          headingId="visit-heading"
          body={HOME_VISIT.body}
          imageUrl={HOME_VISIT.imageUrl}
          imageAlt={HOME_VISIT.imageAlt}
          details={[
            { label: 'Shop', value: SHOP.area },
            { label: 'Open', value: SHOP.openingHours },
            { label: 'Phone', value: SHOP.phone, href: `tel:${SHOP.phoneHref}` },
            { label: 'Delivery', value: SHOP.deliveryNote },
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
