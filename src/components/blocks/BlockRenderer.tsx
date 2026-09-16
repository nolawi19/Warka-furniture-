import Image from 'next/image';
import Link from 'next/link';

import { NewsletterForm } from '@/components/site/NewsletterForm';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCategories, getFeaturedProducts, getProductBySlug, searchProducts } from '@/lib/catalogue';
import { formatMoney } from '@/lib/money';
import type { Block } from '@/lib/site/blocks';
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
  return (
    <>
      {blocks.map((block) => (
        <BlockShell key={block.id} block={block}>
          <BlockBody block={block} />
        </BlockShell>
      ))}
    </>
  );
}

function BlockShell({ block, children }: { block: Block; children: React.ReactNode }) {
  const s = block.style;

  const inner: React.CSSProperties = {
    maxWidth:
      s.width === 'full'
        ? 'none'
        : s.width === 'narrow'
          ? 'var(--wrap-narrow)'
          : s.width === 'custom'
            ? `${s.customWidth}px`
            : 'var(--wrap)',
    marginInline: s.align === 'left' ? '0 auto' : s.align === 'right' ? 'auto 0' : 'auto',
    textAlign: s.align,
  };

  const outer: React.CSSProperties = {
    paddingTop: s.paddingTop,
    paddingBottom: s.paddingBottom,
    paddingInline: s.paddingX || undefined,
    minHeight: s.minHeight || undefined,
    background: s.background || undefined,
    color: s.textColor || undefined,
    borderRadius: s.radius || undefined,
  };

  const body = <div style={inner}>{children}</div>;

  return (
    <section
      className={styles.block}
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
    case 'hero':
      return (
        <div className={styles.hero} data-layout={p.layout}>
          <div className={styles.heroText}>
            {p.kicker && <p className="micro micro--ember">{p.kicker}</p>}
            {p.heading && <h1 className={styles.heroHeading}>{p.heading}</h1>}
            {p.body && <p className={styles.heroBody}>{p.body}</p>}
            {(p.primaryLabel || p.secondaryLabel) && (
              <div className={styles.heroActions}>
                {p.primaryLabel && (
                  <Link href={p.primaryHref || '/shop'} className={styles.btnPrimary}>
                    {p.primaryLabel}
                  </Link>
                )}
                {p.secondaryLabel && (
                  <Link href={p.secondaryHref || '/'} className={styles.btnGhost}>
                    {p.secondaryLabel}
                  </Link>
                )}
              </div>
            )}
          </div>
          {p.imageUrl && (
            <div className={styles.heroImage}>
              <Image src={p.imageUrl} alt={p.imageAlt || ''} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.cover} />
            </div>
          )}
        </div>
      );

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
          {p.imageUrl && (
            <div className={styles.imageTextImage}>
              <Image src={p.imageUrl} alt={p.imageAlt || ''} fill sizes="(max-width: 900px) 100vw, 50vw" className={styles.cover} />
            </div>
          )}
          <div className={styles.imageTextBody}>
            {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
            {p.body && <p className={styles.bodyText}>{p.body}</p>}
            {p.linkLabel && (
              <Link href={p.linkHref || '/shop'} className={styles.btnGhost}>
                {p.linkLabel}
              </Link>
            )}
          </div>
        </div>
      );

    case 'columns':
      return (
        <div className={styles.columns} style={{ '--cols': p.count } as React.CSSProperties}>
          {(p.items ?? []).slice(0, p.count).map((item: any, i: number) => (
            <div key={i} className={styles.column}>
              {item.imageUrl && (
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
      // searchProducts has no limit of its own — it returns the whole matching
      // set — so the block takes the first N rather than asking for N.
      const products =
        p.source === 'category' && p.categorySlug
          ? (await searchProducts({ category: p.categorySlug, sort: 'featured' })).slice(0, p.limit)
          : p.source === 'newest'
            ? (await searchProducts({ sort: 'featured' })).slice(0, p.limit)
            : await getFeaturedProducts(p.limit);

      if (products.length === 0) return null;

      return (
        <>
          {(p.heading || p.linkLabel) && (
            <div className={styles.sectionHead}>
              {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
              {p.linkLabel && (
                <Link href={p.linkHref || '/shop'} className={styles.sectionLink}>
                  {p.linkLabel}
                </Link>
              )}
            </div>
          )}
          <div
            className={styles.productGrid}
            style={
              {
                '--cols-d': p.columnsDesktop,
                '--cols-t': p.columnsTablet,
                '--cols-m': p.columnsMobile,
              } as React.CSSProperties
            }
          >
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </>
      );
    }

    case 'categoryGrid': {
      const categories = (await getCategories()).slice(0, p.limit);
      if (categories.length === 0) return null;
      return (
        <>
          {p.heading && <h2 className={styles.heading}>{p.heading}</h2>}
          <div
            className={styles.categoryGrid}
            style={
              {
                '--cols-d': p.columnsDesktop,
                '--cols-t': p.columnsTablet,
                '--cols-m': p.columnsMobile,
              } as React.CSSProperties
            }
          >
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className={styles.categoryCard}>
                <span className={styles.categoryName}>
                  {c.name}
                  {c.nameAm && <span className="am">{c.nameAm}</span>}
                </span>
                {c.blurb && <span className={styles.categoryBlurb}>{c.blurb}</span>}
                {p.showCounts && (
                  <span className={styles.categoryCount}>
                    {c.pieceCount} {c.pieceCount === 1 ? 'piece' : 'pieces'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
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
            <Link href={`/product/${product.slug}`} className={styles.btnPrimary}>
              See this piece
            </Link>
          </div>
        </div>
      );
    }

    case 'gallery': {
      const images = (p.images ?? []).filter((i: any) => i.url);
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
        <Link
          href={p.href || '/shop'}
          className={p.variant === 'primary' ? styles.btnPrimary : styles.btnGhost}
          data-size={p.size}
        >
          {p.label}
        </Link>
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
            <div>
              <dt>Open</dt>
              <dd>{shop.openingHours}</dd>
            </div>
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
