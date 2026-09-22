import Image from 'next/image';
import { isImageSrc } from '@/lib/image-src';

import type { ProductCardData } from '@/components/shop/ProductCard';
import { Hero } from '@/components/hero/Hero';
import type { HeroContent } from '@/components/hero/hero-content';
import { CategoryStrip } from '@/components/sections/CategoryStrip';
import { Cta } from '@/components/sections/Cta';
import { ProductCarousel } from '@/components/sections/ProductCarousel';
import { ProductStrip } from '@/components/sections/ProductStrip';
import { Quote } from '@/components/sections/Quote';
import { SectionHead } from '@/components/sections/SectionHead';
import { Steps, type Step } from '@/components/sections/Steps';
import { StoreMap } from '@/components/sections/StoreMap';
import { StorePanel, type StoreDetail } from '@/components/sections/StorePanel';
import { NewsletterForm } from '@/components/site/NewsletterForm';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  getCategories,
  getFeaturedProducts,
  getPhotographedProducts,
  getProductBySlug,
  searchProducts,
} from '@/lib/catalogue';
import { formatMoney } from '@/lib/money';
import { blockBox, type Block } from '@/lib/site/blocks';
import { getShop } from '@/lib/site/shop';
import { Reveal } from './Reveal';
import styles from './Blocks.module.css';

/**
 * Turns a page's blocks into the page.
 *
 * A server component, so the blocks that need data — product grids, category
 * grids, a featured product — fetch it themselves at render time rather than
 * being handed a snapshot that goes stale. Every block is wrapped in the same
 * shell, which is what makes width, spacing, colour, alignment and per-device
 * visibility work the same way on all of them.
 */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  // /#categories has to mean the same thing whichever homepage is serving, so
  // the first category block answers to it exactly as the original page's
  // category band does. Only the first: an id is not allowed to repeat.
  const firstCategoryBlock = blocks.find((b) => b.type === 'categoryGrid')?.id;

  return (
    <>
      {blocks.map((block) => (
        <BlockShell key={block.id} block={block} anchor={block.id === firstCategoryBlock ? 'categories' : undefined}>
          <BlockBody block={block} />
        </BlockShell>
      ))}
    </>
  );
}

function BlockShell({
  block,
  children,
  anchor,
}: {
  block: Block;
  children: React.ReactNode;
  anchor?: string;
}) {
  const s = block.style;

  // Every length comes from blockBox, which turns bounded numbers and closed
  // lists into CSS. Nothing the admin types reaches a stylesheet unexamined.
  const box = blockBox(s);

  const inner: React.CSSProperties = {
    maxWidth: box.maxWidth,
    marginInline: s.align === 'left' ? '0 auto' : s.align === 'right' ? 'auto 0' : 'auto',
    textAlign: s.align,
    width: '100%',
  };

  const outer: React.CSSProperties = {
    paddingTop: box.paddingTop,
    paddingBottom: box.paddingBottom,
    paddingInline: s.paddingX || undefined,
    minHeight: box.minHeight,
    background: s.background || undefined,
    color: s.textColor || undefined,
    borderRadius: s.radius || undefined,
    // Only when the block is deliberately taller than its content is there
    // anything to align, so the flex box only appears then.
    ...(box.minHeight
      ? {
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent:
            s.verticalAlign === 'middle' ? 'center' : s.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
        }
      : {}),
  };

  const body = <div style={inner}>{children}</div>;

  return (
    <section
      id={anchor}
      className={styles.block}
      // A block's background and text colour are whatever the admin chose, so
      // they can only be inline. That makes this element a target for
      // extensions that rewrite colours and stamp their own attributes on what
      // they touch — which the server never rendered, and which would
      // otherwise fail hydration for the whole page.
      suppressHydrationWarning
      style={outer}
      data-block-id={block.id}
      data-hide-desktop={!s.showOnDesktop}
      data-hide-tablet={!s.showOnTablet}
      data-hide-mobile={!s.showOnMobile}
    >
      <div className={s.width === 'full' ? undefined : 'wrap'}>
        {block.animation.name === 'none' ? (
          body
        ) : (
          <Reveal name={block.animation.name} duration={block.animation.duration} delay={block.animation.delay}>
            {body}
          </Reveal>
        )}
      </div>
    </section>
  );
}

 
async function BlockBody({ block }: { block: Block }) {
  const p = block.props as any;

  switch (block.type) {
    // Not a rendering of a hero: the hero itself, with the block's props as
    // its props. The builder cannot preview a hero the site would draw
    // differently, because there is only one of them.
    case 'hero':
      return <Hero {...(p as Partial<HeroContent>)} headingId={`hero-${block.id}`} wrap={false} />;

    case 'heading': {
      const Tag = (p.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <>
          {p.kicker && <p className="micro micro--ember">{p.kicker}</p>}
          <Tag className={styles.heading}>{p.text}</Tag>
        </>
      );
    }

    case 'paragraph':
      return (
        <div className={styles.prose} data-size={p.size}>
          {String(p.text ?? '')
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      );

    case 'image':
      if (!p.url) return null;
      return (
        <figure className={styles.figure}>
          <div
            className={styles.imageBox}
            style={{
              aspectRatio: p.aspect === 'auto' ? undefined : p.aspect,
              height: p.height || undefined,
            }}
          >
            <Image
              src={p.url}
              alt={p.alt || ''}
              fill
              sizes="(max-width: 900px) 100vw, 1000px"
              style={{ objectFit: p.fit }}
            />
          </div>
          {p.caption && <figcaption className={styles.caption}>{p.caption}</figcaption>}
        </figure>
      );

    case 'imageText':
      return (
        <div className={styles.imageText} data-side={p.imageSide}>
          {isImageSrc(p.imageUrl) && (
            <div className={styles.imageTextImage}>
              <Image src={p.imageUrl} alt={p.imageAlt || ''} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.cover} />
            </div>
          )}
          <div className={styles.imageTextBody}>
            {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
            {p.body && <p className={styles.bodyText}>{p.body}</p>}
            {p.linkLabel && (
              <ActionButton as="link" href={p.linkHref || '/shop'} variant="ghost">
                {p.linkLabel}
              </ActionButton>
            )}
          </div>
        </div>
      );

    case 'columns':
      return (
        <div className={styles.columns} style={{ '--cols': p.count } as React.CSSProperties}>
          {(p.items ?? []).slice(0, p.count).map((item: any, i: number) => (
            <div key={i} className={styles.column}>
              {isImageSrc(item.imageUrl) && (
                <div className={styles.columnImage}>
                  <Image src={item.imageUrl} alt="" fill sizes="33vw" className={styles.cover} />
                </div>
              )}
              {item.heading && <h3 className={styles.columnHeading}>{item.heading}</h3>}
              {item.body && <p className={styles.bodyText}>{item.body}</p>}
            </div>
          ))}
        </div>
      );

    case 'productGrid': {
      const products = await productsFor(p);

      return (
        <ProductStrip
          products={products}
          kicker={p.kicker}
          heading={p.heading}
          headingId={`h-${block.id}`}
          linkLabel={p.linkLabel}
          linkHref={p.linkHref || '/shop'}
          columns={{
            mobile: p.columnsMobile,
            tablet: p.columnsTablet,
            desktop: p.columnsDesktop,
          }}
          emptyLabel={
            p.source === 'photographed'
              ? 'Nothing is photographed yet. The catalogue is still the place to look.'
              : undefined
          }
        />
      );
    }

    case 'productCarousel': {
      const products = await productsFor(p);

      return (
        <ProductCarousel
          products={products}
          kicker={p.kicker}
          heading={p.heading}
          headingId={`h-${block.id}`}
          linkLabel={p.linkLabel}
          linkHref={p.linkHref || '/shop'}
          visibleDesktop={p.visibleDesktop}
          visibleMobile={p.visibleMobile}
          emptyLabel={
            p.source === 'photographed'
              ? 'Nothing is photographed yet. The catalogue is still the place to look.'
              : undefined
          }
        />
      );
    }

    case 'cta':
      return (
        <Cta
          kicker={p.kicker}
          heading={p.heading}
          headingId={`h-${block.id}`}
          body={p.body}
          primaryLabel={p.primaryLabel}
          primaryHref={p.primaryHref}
          secondaryLabel={p.secondaryLabel}
          secondaryHref={p.secondaryHref}
        />
      );

    case 'map': {
      const shop = await getShop();
      // 0,0 is the schema's "not set". A map of the Gulf of Guinea is worse
      // than no map, so the block renders nothing until somebody sets it.
      //
      // Finite is checked as well as zero, and not out of caution: settings are
      // read through unstable_cache, and a cache entry written before these two
      // fields existed comes back without them. `undefined === 0` is false, so
      // a zero-only test put a map of nowhere on the page until the cache
      // turned over. A field that is new is a field that can be missing.
      const pinned =
        Number.isFinite(shop.latitude) &&
        Number.isFinite(shop.longitude) &&
        !(shop.latitude === 0 && shop.longitude === 0);
      if (!pinned) return null;
      return (
        <>
          {(p.heading || p.kicker) && (
            <SectionHead kicker={p.kicker} heading={p.heading ?? ''} headingId={`h-${block.id}`} />
          )}
          <StoreMap
            lat={shop.latitude}
            lng={shop.longitude}
            label={shop.name}
            zoom={p.zoom}
            height={p.height}
          />
          {p.showAddress && <p className={styles.bodyText}>{shop.area}</p>}
        </>
      );
    }

    case 'categoryGrid': {
      const categories = (await getCategories()).slice(0, p.limit);
      return (
        <CategoryStrip
          categories={categories}
          kicker={p.kicker}
          heading={p.heading}
          headingId={`h-${block.id}`}
          linkLabel={p.linkLabel}
          linkHref={p.linkHref || '/shop'}
          showCounts={p.showCounts}
        />
      );
    }

    case 'steps': {
      const items = ((p.items ?? []) as Step[]).filter((i) => i.t);
      if (items.length === 0) return null;
      return (
        <Steps
          steps={items}
          kicker={p.kicker}
          heading={p.heading}
          headingId={`h-${block.id}`}
          note={p.note}
        />
      );
    }

    case 'quote':
      if (!p.text) return null;
      return <Quote text={p.text} cite={p.cite} />;

    case 'storeInfo': {
      const shop = await getShop();
      const details: StoreDetail[] = [];
      if (p.showArea) details.push({ label: 'Shop', value: shop.area });
      if (p.showHours && shop.openingHours) details.push({ label: 'Open', value: shop.openingHours });
      if (p.showPhone) details.push({ label: 'Phone', value: shop.phone, href: `tel:${shop.phoneHref}` });
      if (p.showEmail) details.push({ label: 'Email', value: shop.email, href: `mailto:${shop.email}` });
      if (p.showDelivery && shop.deliveryNote) details.push({ label: 'Delivery', value: shop.deliveryNote });

      return (
        <StorePanel
          heading={p.heading}
          headingId={`h-${block.id}`}
          kicker={p.kicker}
          body={p.body}
          imageUrl={p.imageUrl || undefined}
          imageAlt={p.imageAlt}
          details={details}
          primaryLabel={p.primaryLabel}
          primaryHref={p.primaryHref}
          secondaryLabel={p.secondaryLabel}
          secondaryHref={p.secondaryHref}
        />
      );
    }

    case 'featuredProduct': {
      if (!p.slug) return null;
      const product = await getProductBySlug(p.slug);
      if (!product) return null;
      const image = product.images[0];
      const prices = product.variants
        .map((v) => v.salePriceSantim ?? v.priceSantim)
        .filter((n): n is number => n !== null);

      return (
        <div className={styles.featured}>
          {image && (
            <div className={styles.featuredImage}>
              <Image src={image.url} alt={image.alt} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.cover} />
            </div>
          )}
          <div className={styles.featuredBody}>
            {p.heading && <p className="micro micro--ember">{p.heading}</p>}
            <h2 className={styles.heading}>{product.name}</h2>
            {(p.body || product.description) && (
              <p className={styles.bodyText}>{p.body || product.description}</p>
            )}
            <p className={styles.featuredPrice}>
              {prices.length > 0 ? formatMoney(Math.min(...prices)) : 'Priced in the shop'}
            </p>
            <ActionButton as="link" href={`/product/${product.slug}`} variant="primary" icon="arrow">
              See this piece
            </ActionButton>
          </div>
        </div>
      );
    }

    case 'gallery': {
      const images = (p.images ?? []).filter((i: any) => isImageSrc(i.url));
      if (images.length === 0) return null;
      return (
        <>
          {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
          <div
            className={styles.gallery}
            style={{ '--cols-d': p.columnsDesktop, '--cols-m': p.columnsMobile } as React.CSSProperties}
          >
            {images.map((img: any, i: number) => (
              <div key={i} className={styles.galleryItem}>
                <Image src={img.url} alt={img.alt || ''} fill sizes="(max-width: 700px) 50vw, 33vw" className={styles.cover} />
              </div>
            ))}
          </div>
        </>
      );
    }

    case 'testimonials': {
      const items = (p.items ?? []).filter((i: any) => i.quote);
      if (items.length === 0) return null;
      return (
        <>
          {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
          <div className={styles.testimonials}>
            {items.map((t: any, i: number) => (
              <figure key={i} className={styles.testimonial}>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <strong>{t.name}</strong>
                  {t.detail && <span>{t.detail}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      );
    }

    case 'faq': {
      const items = (p.items ?? []).filter((i: any) => i.question);
      if (items.length === 0) return null;
      return (
        <>
          {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
          <div className={styles.faq}>
            {items.map((item: any, i: number) => (
              // <details> so it works with no JavaScript at all, and is
              // already keyboard-operable and announced correctly.
              <details key={i} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <div className={styles.faqAnswer}>
                  {String(item.answer ?? '')
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para: string, j: number) => (
                      <p key={j}>{para}</p>
                    ))}
                </div>
              </details>
            ))}
          </div>
        </>
      );
    }

    case 'button':
      if (!p.label) return null;
      return (
        <ActionButton as="link" href={p.href || '/shop'} variant={p.variant} size={p.size}>
          {p.label}
        </ActionButton>
      );

    case 'newsletter':
      return (
        <div className={styles.newsletter}>
          {p.body && <p className={styles.bodyText}>{p.body}</p>}
          <NewsletterForm heading={p.heading || 'News from the workshop'} source="page" />
        </div>
      );

    case 'contact': {
      const shop = await getShop();
      return (
        <div className={styles.contact}>
          {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
          {p.body && <p className={styles.bodyText}>{p.body}</p>}
          <dl className={styles.contactList}>
            {p.showAddress && (
              <div>
                <dt>Where</dt>
                <dd>{shop.area}</dd>
              </div>
            )}
            {p.showPhone && (
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${shop.phoneHref}`}>{shop.phone}</a>
                </dd>
              </div>
            )}
            {p.showEmail && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${shop.email}`}>{shop.email}</a>
                </dd>
              </div>
            )}
            {shop.openingHours && (
              <div>
                <dt>Open</dt>
                <dd>{shop.openingHours}</dd>
              </div>
            )}
          </dl>
        </div>
      );
    }

    case 'video':
      if (!p.url) return null;
      return (
        <div className={styles.video} style={{ aspectRatio: p.aspect }}>
          <iframe
            src={p.url}
            title={p.title || 'Video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'spacer':
      return <div style={{ height: p.height }} aria-hidden="true" />;

    case 'divider':
      return <hr className={styles.divider} data-style={p.style} />;

    default:
      return null;
  }
}

/**
 * Which products a block is asking for.
 *
 * The grid and the carousel offer the same four choices, so they read them in
 * the same place — otherwise "newest" would quietly come to mean two things.
 *
 * The block asks for exactly the page it needs, so a grid of six does not
 * fetch the catalogue to throw most of it away.
 */
async function productsFor(p: {
  source: string;
  categorySlug?: string;
  limit: number;
}): Promise<ProductCardData[]> {
  if (p.source === 'category' && p.categorySlug) {
    return (await searchProducts({ category: p.categorySlug, sort: 'featured', perPage: p.limit }))
      .products;
  }
  if (p.source === 'newest') return (await searchProducts({ sort: 'newest', perPage: p.limit })).products;
  if (p.source === 'photographed') return getPhotographedProducts(p.limit);
  return getFeaturedProducts(p.limit);
}
