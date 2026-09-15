import styles from './Card.module.css';

export function Card({
  title,
  description,
  actions,
  children,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={styles.card}>
      {(title || actions) && (
        <header className={styles.head}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </section>
  );
}

export function CardGrid({ children, min = 300 }: { children: React.ReactNode; min?: number }) {
  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
