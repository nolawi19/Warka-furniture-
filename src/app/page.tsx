import Image from 'next/image';
import Link from 'next/link';

import { Hero } from '@/components/hero/Hero';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCategories, getPhotographedProducts } from '@/lib/catalogue';
import { SHOP } from '@/lib/shop-details';
import styles from './page.module.css';

export const revalidate = 300;

export default async function HomePage() {
  const [categories, showroom] = await Promise.all([
    getCategories(),
    getPhotographedProducts(6),
  ]);

  const pieceCount = categories.reduce((n, c) => n + c.pieceCount, 0);

  return (
    <>
      <Hero pieceCount={pieceCount} />

      {/* ---------------------------------------------------- what we make */}
      <section className={`wrap ${styles.section}`} aria-labelledby="categories-heading">
        <header className={styles.sectionHead}>
          <h2 id="categories-heading" className="dsp h2">
            What we make
          </h2>
          <Link href="/shop" className={styles.sectionLink}>
            All {pieceCount} pieces
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </header>

        <ul className={styles.categories}>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop?category=${c.slug}`} className={styles.category}>
                <span className={styles.categoryName}>
                  {c.name}
                  {c.nameAm && (
                    <span className={`am ${styles.categoryAm}`} lang="am">
                      {c.nameAm}
                    </span>
                  )}
                </span>
                <span className={styles.categoryBlurb}>{c.blurb}</span>
                <span className={styles.categoryCount}>{c.pieceCount} pieces</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------- on the floor */}
      <section className={`wrap ${styles.section}`} aria-labelledby="showroom-heading">
        <header className={styles.sectionHead}>
          <div>
            <p className="micro micro--ember">Photographed in the workshop</p>
            <h2 id="showroom-heading" className="dsp h2">
              On the floor now
            </h2>
          </div>
          <Link href="/shop" className={styles.sectionLink}>
            Browse everything
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </header>

        <div className={styles.grid}>
          {showroom.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              priority={i < 3}
              sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 400px"
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- how you buy */}
      <section className={`wrap ${styles.section}`} aria-labelledby="how-heading">
        <header className={styles.sectionHead}>
          <h2 id="how-heading" className="dsp h2">
            How you buy it
          </h2>
          <p className="micro">{SHOP.area}</p>
        </header>

        <ol className={styles.steps}>
          {[
            {
              n: '01',
              t: 'Built to your room',
              d: 'Beds and tables are made to the measurement you bring in, not to a fixed catalogue size.',
            },
            {
              n: '02',
              t: 'You pick the board',
              d: 'The same piece in white melamine or grey marble laminate. Chosen when you order, not after.',
            },
            {
              n: '03',
              t: 'Buttoned in the shop',
              d: 'Headboards and bed rails are padded and buttoned here, in the pattern and colour you choose.',
            },
            {
              n: '04',
              t: 'Delivered in Addis',
              d: 'Brought to your floor and set up. You pick the day when you place the order.',
            },
          ].map((s) => (
            <li key={s.n} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {s.n}
              </span>
              <h3 className={styles.stepTitle}>{s.t}</h3>
              <p className={styles.stepText}>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------- the name */}
      <section className={styles.quote} aria-label="About the name">
        <blockquote className={styles.quoteText}>
          A bed is used eight hours a night. Everything else in the house gets less.
        </blockquote>
      </section>

      {/* ---------------------------------------------------- visit */}
      <section className={`wrap ${styles.section}`} id="visit" aria-labelledby="visit-heading">
        <header className={styles.sectionHead}>
          <h2 id="visit-heading" className="dsp h2">
            Visit the workshop
          </h2>
        </header>

        <div className={styles.visit}>
          <Image
            src="/brand/shopfront.jpg"
            alt="The Warka Furniture shopfront in Kebena, Addis Ababa, with a finished buttoned bed standing outside"
            width={432}
            height={511}
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.visitImage}
          />
          <div className={styles.visitBody}>
            <p className="lede">
              Come and see a piece before you order. There is usually a bed and a dressing table
              finished and standing on the floor, and you can open the drawers.
            </p>
            <dl className={styles.details}>
              <div>
                <dt>Shop</dt>
                <dd>{SHOP.area}</dd>
              </div>
              <div>
                <dt>Open</dt>
                <dd>{SHOP.openingHours}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>
                </dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{SHOP.deliveryNote}</dd>
              </div>
            </dl>
            <div className={styles.visitCta}>
              <Link href="/shop" className={styles.btnPrimary}>
                See the pieces
              </Link>
              <Link href="/contact" className={styles.btnGhost}>
                Ask a question
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
