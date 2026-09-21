'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import styles from './ActionButton.module.css';

/**
 * The button.
 *
 * One rule governs everything here: **the action fires first, the animation
 * decorates it.** Nothing in this component ever delays, debounces or awaits a
 * visual effect before calling onClick. The ripple is painted in the same tick
 * the handler runs in; if the handler navigates away mid-ripple, that is the
 * correct outcome, not a bug.
 *
 * Every timing is 100–220ms. Press feedback is 90ms, which is about as short as
 * a transition can be and still be seen.
 */

type Variant = 'primary' | 'brass' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type Icon = 'arrow' | 'cart' | 'none';

type Common = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  className?: string;
  fullWidth?: boolean;
  /** Shows a spinner and blocks re-entry. Only pass this for real waiting. */
  loading?: boolean;
  /** Plays a one-off tick. Drive it from the result of the action. */
  success?: boolean;
};

type ButtonProps = Common & {
  as?: 'button';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  'aria-label'?: string;
};

type LinkProps = Common & {
  as: 'link';
  href: string;
  prefetch?: boolean;
  /** For an href that leaves the site. Pass rel alongside it. */
  target?: '_blank' | '_self';
  rel?: string;
  'aria-label'?: string;
};

type Ripple = { id: number; x: number; y: number; size: number };

function useRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const spawn = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    // Big enough to reach the far corner from wherever it was pressed.
    const size = Math.max(rect.width, rect.height) * 2;
    const id = nextId.current++;

    setRipples((current) => [
      ...current,
      { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
    ]);

    // Cleared on a timer rather than animationend: if the button unmounts
    // because the click navigated, no event ever fires and the array would
    // grow forever in a component that came back.
    window.setTimeout(() => {
      setRipples((current) => current.filter((r) => r.id !== id));
    }, 420);
  }, []);

  return { ripples, spawn };
}

function Chrome({
  ripples,
  icon,
  loading,
  success,
  children,
}: {
  ripples: Ripple[];
  icon: Icon;
  loading?: boolean;
  success?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>

      {ripples.map((r) => (
        <span
          key={r.id}
          className={styles.ripple}
          aria-hidden="true"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      <span className={styles.label} data-busy={loading || success}>
        {children}
        {icon === 'arrow' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h13M12 6l6 6-6 6" />
          </svg>
        )}
        {icon === 'cart' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h2.2l1.8 10.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20.2 9H7" />
            <circle cx="10" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="17.4" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        )}
      </span>

      {loading && <span className={styles.spinner} aria-hidden="true" />}

      {success && !loading && (
        <span className={styles.tick} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6.5 9.5 17 4 11.5" />
          </svg>
        </span>
      )}
    </>
  );
}

export function ActionButton(props: ButtonProps | LinkProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    icon = 'none',
    className = '',
    fullWidth,
    loading,
    success,
  } = props;

  const { ripples, spawn } = useRipples();

  const cls = [styles.btn, className].filter(Boolean).join(' ');
  const data = {
    'data-variant': variant,
    'data-size': size,
    'data-full': fullWidth ? 'true' : undefined,
    'data-loading': loading ? 'true' : undefined,
    'data-success': success ? 'true' : undefined,
  };

  if (props.as === 'link') {
    return (
      <Link
        href={props.href}
        prefetch={props.prefetch}
        target={props.target}
        rel={props.rel}
        className={cls}
        aria-label={props['aria-label']}
        onClick={spawn}
        {...data}
      >
        <Chrome ripples={ripples} icon={icon} loading={loading} success={success}>
          {children}
        </Chrome>
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? 'button'}
      className={cls}
      disabled={props.disabled || loading}
      aria-label={props['aria-label']}
      aria-busy={loading || undefined}
      onClick={(e) => {
        // Ripple first so it is queued in this same frame, then the real work.
        // Both happen before the browser paints; the user never waits on us.
        spawn(e);
        props.onClick?.(e);
      }}
      {...data}
    >
      <Chrome ripples={ripples} icon={icon} loading={loading} success={success}>
        {children}
      </Chrome>
    </button>
  );
}
