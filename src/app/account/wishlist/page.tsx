import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProductCard } from '@/components/shop/ProductCard';
import { Icon } from '@/components/ui/Icon';
import { currentUser } from '@/lib/auth';
import { savedPieces } from '@/lib/wishlist';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Saved pieces',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The saved list.
 *
 * Rows hang off a variant, so this is a list of "the bed in white melamine",
 * not a list of beds. Two finishes of the same piece are two entries, which is
 * right: they are two different things to buy, at two different prices, with
 * two different stock counts.
 *
 * A piece the shop has since unpublished simply does not appear — savedPieces
 * filters it out and leaves the row alone, so it comes back if the shop
 * publishes it again.
 */
export default async function WishlistPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account/wishlist');

  const pieces = await savedPieces();

  return (
    <div className="wrap">
      <div className={styles.page}>
        <header className={styles.head}>
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <Link href="/account">Your account</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Saved</span>
          </nav>
          <h1 className={`dsp ${styles.title}`}>Saved pieces</h1>
          {pieces.length > 0 && (
            <p className={styles.count}>
              <span className="nums">{pieces.length}</span>{' '}
              {pieces.length === 1 ? 'piece' : 'pieces'}, newest first
            </p>
          )}
        </header>

        {pieces.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Icon name="heart" size={28} />
            </span>
            <h2 className={styles.emptyTitle}>Nothing saved yet</h2>
            <p className={styles.emptyText}>
              The heart on any piece keeps it here. It stays on your account, so it is still here
              on your phone tomorrow.
            </p>
            <Link href="/shop" className={styles.cta}>
              Browse the catalogue
            </Link>
          </div>
        ) : (
          <ul className={styles.grid}>
            {pieces.map((piece) => (
              <li key={piece.variantId}>
                <ProductCard
                  product={piece}
                  saved
                  sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
                />
                {/* Which finish was saved. The card shows the piece; without
                    this, two saved variants of one bed look like a duplicate. */}
                {piece.variantLabel && (
                  <p className={styles.variant}>
                    <Icon name="check" size={14} />
                    {piece.variantLabel}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
