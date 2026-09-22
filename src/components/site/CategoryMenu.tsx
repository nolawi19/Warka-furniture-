'use client';

import Image from 'next/image';

import { isImageSrc } from '@/lib/image-src';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import styles from './CategoryMenu.module.css';

export type MenuCategory = {
  slug: string;
  name: string;
  nameAm: string | null;
  blurb: string | null;
  imageUrl: string | null;
  pieceCount: number;
};

/**
 * The Categories panel.
 *
 * Built from the database, never from a list in the source — the shop adds a
 * category in the admin and it appears here, which is the only arrangement
 * that stays true.
 *
 * Opens on hover for a pointer and on click for everything else, and the
 * click path is the real one: the trigger is a button with aria-expanded, the
 * panel closes on Escape and on a click outside, and focus returns to the
 * trigger. Hover is a convenience laid on top, not the mechanism.
 */
export function CategoryMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  // A short grace period on leaving: the gap between the trigger and the panel
  // is a few pixels of nothing, and closing the instant the cursor crosses it
  // makes the menu feel like it is dodging.
  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }
  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  const featured = categories.slice(0, 6);

  return (
    <div
      className={styles.wrap}
      ref={wrapRef}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          cancelClose();
          setOpen(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') scheduleClose();
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="category-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Categories
        <Icon name="chevron-down" size={15} className={styles.chevron} />
      </button>

      <div id="category-panel" className={styles.panel} data-open={open} hidden={!open}>
        <div className={styles.panelInner}>
          <ul className={styles.grid}>
            {featured.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} className={styles.item} onClick={() => setOpen(false)}>
                  <span className={styles.thumb}>
                    {isImageSrc(c.imageUrl) ? (
                      <Image src={c.imageUrl} alt="" fill sizes="88px" className={styles.thumbImg} />
                    ) : (
                      <Icon name="grid" size={18} />
                    )}
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemName}>
                      {c.name}
                      {c.nameAm && (
                        <span className={`am ${styles.itemAm}`} lang="am">
                          {c.nameAm}
                        </span>
                      )}
                    </span>
                    <span className={styles.itemCount}>
                      {c.pieceCount} {c.pieceCount === 1 ? 'piece' : 'pieces'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/shop" className={styles.all} onClick={() => setOpen(false)}>
            Everything we make
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
