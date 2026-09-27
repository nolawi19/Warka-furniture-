'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import styles from './ProductGallery.module.css';

type GalleryImage = { url: string; alt: string };

/**
 * A piece's photographs.
 *
 * The main picture steps through with the arrows, the arrow keys or a swipe,
 * and opens full screen on a click. Full screen, a click zooms to the point
 * clicked. Every gesture has a button and a key that does the same thing.
 *
 * The shop's photographs are small (most are under 450px across), so the
 * full-screen view never blows one up past twice its real size — beyond that
 * it only gets blurrier, not more detailed.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const count = images.length;
  const step = (by: number) => setIndex((i) => (i + by + count) % count);
  const swipe = useSwipe(count > 1 ? step : null);

  if (count === 0) {
    return (
      <div className={styles.gallery}>
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="1.5" />
            <path d="M3 15.5l4.2-3.6 3.4 2.6 4-3.4L21 15" />
          </svg>
          <p>This line has not been photographed yet</p>
          <p className={styles.emptyHint}>
            There is one standing in the workshop. Come and see it, or ask us to send a photograph.
          </p>
        </div>
      </div>
    );
  }

  const current = images[Math.min(index, count - 1)];
  const alt = (img: GalleryImage) => img.alt || `${productName}, photographed in the Warka Furniture workshop`;

  return (
    <div className={styles.gallery}>
      <div
        className={styles.main}
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
        {...swipe}
      >
        <button
          type="button"
          className={styles.open}
          onClick={() => setViewer(true)}
          aria-label={`View ${count > 1 ? `photograph ${index + 1} of ${count}` : 'the photograph'} full screen`}
        >
          <Image
            key={current.url}
            src={current.url}
            alt={alt(current)}
            fill
            sizes="(max-width: 900px) 100vw, 55vw"
            priority
            className={styles.mainImage}
          />
          <span className={styles.hint} aria-hidden="true">
            <Icon name="search" size={14} />
            View full screen
          </span>
        </button>

        {count > 1 && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => step(-1)} aria-label="Previous photograph">
              <Icon name="chevron-left" size={18} />
            </button>
            <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => step(1)} aria-label="Next photograph">
              <Icon name="chevron-right" size={18} />
            </button>
            <span className={`nums ${styles.counter}`} aria-hidden="true">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                className={styles.thumb}
                aria-pressed={i === index}
                aria-label={`Photograph ${i + 1} of ${count}`}
                onClick={() => setIndex(i)}
              >
                <Image src={img.url} alt="" width={84} height={100} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewer && (
        <Viewer
          images={images}
          index={index}
          alt={alt}
          onStep={step}
          onClose={() => setViewer(false)}
        />
      )}
    </div>
  );
}

/** Left/right swipe on touch; returns pointer handlers to spread on an element. */
function useSwipe(onStep: ((by: number) => void) | null) {
  const start = useRef<{ x: number; y: number } | null>(null);
  if (!onStep) return {};
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      // A deliberate sideways move, not a scroll that drifted.
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) onStep(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

function Viewer({
  images,
  index,
  alt,
  onStep,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  alt: (img: GalleryImage) => string;
  onStep: (by: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<{ url: string; x: number; y: number } | null>(null);
  const [natural, setNatural] = useState<{ url: string; w: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const current = images[index];
  const zoomed = zoom?.url === current.url;
  const swipe = useSwipe(count > 1 && !zoomed ? onStep : null);

  // The latest handlers, for the keyboard listener below, which is set up
  // once: re-running it on every step would pull focus back to Close.
  const handlers = useRef({ onStep, onClose, count });
  useEffect(() => {
    handlers.current = { onStep, onClose, count };
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      const h = handlers.current;
      if (e.key === 'Escape') h.onClose();
      if (h.count > 1 && e.key === 'ArrowRight') h.onStep(1);
      if (h.count > 1 && e.key === 'ArrowLeft') h.onStep(-1);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  // Never more than twice the photograph's own width.
  const maxWidth = natural?.url === current.url ? natural.w * 2 : undefined;

  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label="Photographs, full screen">
      <div className={styles.viewerBar}>
        {count > 1 && (
          <span className={`nums ${styles.viewerCount}`}>
            {index + 1} / {count}
          </span>
        )}
        <button
          type="button"
          className={styles.viewerZoom}
          onClick={() => setZoom(zoomed ? null : { url: current.url, x: 50, y: 50 })}
          aria-pressed={zoomed}
        >
          <Icon name={zoomed ? 'minus' : 'plus'} size={16} />
          {zoomed ? 'Zoom out' : 'Zoom in'}
        </button>
        <button ref={closeRef} type="button" className={styles.viewerClose} onClick={onClose} aria-label="Close full screen">
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className={styles.viewerStage} {...swipe}>
        <button
          type="button"
          className={styles.viewerFrame}
          data-zoomed={zoomed || undefined}
          style={maxWidth ? { maxWidth } : undefined}
          aria-label={zoomed ? 'Zoom out' : 'Zoom in on this point'}
          onClick={(e) => {
            if (zoomed) return setZoom(null);
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({
              url: current.url,
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
        >
          <Image
            key={current.url}
            src={current.url}
            alt={alt(current)}
            fill
            sizes="100vw"
            className={styles.viewerImage}
            style={zoomed ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            onLoad={(e) => setNatural({ url: current.url, w: e.currentTarget.naturalWidth })}
          />
        </button>

        {count > 1 && (
          <>
            <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => onStep(-1)} aria-label="Previous photograph">
              <Icon name="chevron-left" size={20} />
            </button>
            <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => onStep(1)} aria-label="Next photograph">
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
