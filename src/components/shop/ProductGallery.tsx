'use client';

import Image from 'next/image';
import { useState } from 'react';

import styles from './ProductGallery.module.css';

type GalleryImage = { url: string; alt: string };

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (images.length === 0) {
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

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className={styles.gallery}>
      <div
        className={styles.main}
        data-zoomed={zoomed}
        onClick={() => setZoomed((z) => !z)}
        role="button"
        tabIndex={0}
        aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setZoomed((z) => !z);
          }
        }}
      >
        <Image
          src={current.url}
          alt={current.alt || `${productName}, photographed in the Warka Furniture workshop`}
          fill
          sizes="(max-width: 900px) 100vw, 55vw"
          priority
          className={styles.mainImage}
        />
        <span className={styles.zoomHint} aria-hidden="true">
          {zoomed ? 'Click to zoom out' : 'Click to zoom'}
        </span>
      </div>

      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                className={styles.thumb}
                aria-pressed={i === index}
                aria-label={`View image ${i + 1} of ${images.length}`}
                onClick={() => {
                  setIndex(i);
                  setZoomed(false);
                }}
              >
                <Image src={img.url} alt="" width={84} height={63} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
