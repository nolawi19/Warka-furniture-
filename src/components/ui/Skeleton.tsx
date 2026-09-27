import styles from './Skeleton.module.css';

/**
 * Route skeletons, one per kind of page, each laid out like the page it
 * stands in for. They are what `loading.tsx` shows while a page's data is on
 * its way — see the stylesheet for why they fade in after a delay.
 */

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`${styles.block} ${className}`} style={style} />;
}

/** The accessible wrapper every skeleton shares. */
function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.root} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

const w = (width: string): React.CSSProperties => ({ width });

export function ShopSkeleton() {
  return (
    <Loading label="Loading the catalogue…">
      <div className="wrap">
        <div className={styles.shopHead}>
          <Bone className={styles.line} style={w('120px')} />
          <Bone className={styles.title} style={w('min(420px, 80%)')} />
          <Bone className={styles.line} style={w('min(520px, 90%)')} />
        </div>
        <div className={styles.shopBody}>
          <div className={`${styles.stackLg} ${styles.filters}`}>
            <Bone className={styles.pill} />
            {Array.from({ length: 7 }, (_, i) => (
              <Bone key={i} className={styles.line} style={w(`${60 + ((i * 17) % 35)}%`)} />
            ))}
          </div>
          <div className={styles.cards}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.card}>
                <Bone className={styles.media} />
                <Bone className={styles.line} style={w('40%')} />
                <Bone className={styles.lineLg} style={w('70%')} />
                <Bone className={styles.line} style={w('50%')} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function ProductSkeleton() {
  return (
    <Loading label="Loading this piece…">
      <div className="wrap">
        <div className={styles.product}>
          <div>
            <Bone className={styles.square} />
            <div className={styles.thumbs}>
              <Bone className={styles.thumb} />
              <Bone className={styles.thumb} />
              <Bone className={styles.thumb} />
            </div>
          </div>
          <div className={styles.stackLg}>
            <Bone className={styles.line} style={w('90px')} />
            <Bone className={styles.title} style={w('75%')} />
            <Bone className={styles.lineLg} style={w('140px')} />
            <div className={styles.chips}>
              {Array.from({ length: 4 }, (_, i) => (
                <Bone key={i} className={styles.chip} />
              ))}
            </div>
            <div className={styles.chips}>
              <Bone className={styles.chip} />
              <Bone className={styles.chip} />
            </div>
            <Bone className={styles.pill} style={{ height: 52 }} />
            <div className={styles.stack}>
              <Bone className={styles.line} />
              <Bone className={styles.line} style={w('92%')} />
              <Bone className={styles.line} style={w('64%')} />
            </div>
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function CartSkeleton({ label = 'Loading your basket…' }: { label?: string }) {
  return (
    <Loading label={label}>
      <div className="wrap">
        <div className={styles.page}>
          <Bone className={styles.title} style={w('min(320px, 70%)')} />
          <div className={styles.split}>
            <div>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className={styles.row}>
                  <Bone className={styles.rowThumb} />
                  <div className={styles.stack}>
                    <Bone className={styles.lineLg} style={w('60%')} />
                    <Bone className={styles.line} style={w('40%')} />
                  </div>
                  <Bone className={styles.lineLg} />
                </div>
              ))}
            </div>
            <div className={styles.panel}>
              <Bone className={styles.lineLg} style={w('50%')} />
              <Bone className={styles.line} />
              <Bone className={styles.line} />
              <Bone className={styles.pill} style={{ height: 52 }} />
            </div>
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function AccountSkeleton({ label = 'Loading your account…' }: { label?: string }) {
  return (
    <Loading label={label}>
      <div className="wrap">
        <div className={styles.page}>
          <Bone className={styles.line} style={w('120px')} />
          <Bone className={styles.title} style={w('min(360px, 75%)')} />
          <div className={styles.tiles}>
            <Bone className={styles.tile} />
            <Bone className={styles.tile} />
            <Bone className={styles.tile} />
          </div>
          <div>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.row}>
                <Bone className={styles.rowThumb} style={{ width: 56, height: 56 }} />
                <div className={styles.stack}>
                  <Bone className={styles.lineLg} style={w('45%')} />
                  <Bone className={styles.line} style={w('30%')} />
                </div>
                <Bone className={styles.line} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function AdminSkeleton() {
  return (
    <Loading label="Loading…">
      <div className={styles.admin}>
        <Bone className={styles.title} style={w('min(280px, 60%)')} />
        <div className={styles.stats}>
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className={styles.stat} />
          ))}
        </div>
        <div className={styles.table}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={styles.tr}>
              <Bone className={styles.trThumb} />
              <Bone className={styles.line} style={w('70%')} />
              <Bone className={styles.line} style={w('60%')} />
              <Bone className={styles.line} style={w('40%')} />
              <Bone className={styles.line} />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}
