'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createSignScene, type SignController, type Tier } from './sign-scene';
import styles from './WarkaSign.module.css';

/**
 * Picks a quality tier before any WebGL work happens.
 *
 * Deliberately conservative: a phone that can technically render this at 2x
 * with shadows will still get warm and drain battery doing it, and the sign
 * looks nearly identical a tier down.
 */
function detectTier(): Tier | 'none' {
  if (typeof window === 'undefined') return 'none';

  const canvas = document.createElement('canvas');
  const gl =
    (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl') as WebGLRenderingContext | null);
  if (!gl) return 'none';

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 760;

  // Save-Data is a direct request from the reader. Honour it.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (conn?.saveData) return 'low';
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return 'low';

  if (cores <= 4 || memory <= 2) return 'low';
  if (coarse || narrow || cores <= 6) return 'mid';
  return 'high';
}

export function WarkaSign() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SignController | null>(null);
  const [mode, setMode] = useState<'pending' | 'live' | 'static'>('pending');
  const [replayable, setReplayable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const tier = detectTier();
    if (tier === 'none') {
      // No WebGL: a still of the sign is better than an empty box, and the
      // page loses nothing else.
      setMode('static');
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedMotion = motionQuery.matches;

    let controller: SignController;
    try {
      controller = createSignScene({
        canvas,
        tier,
        reducedMotion,
        theme:
          (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light',
      });
    } catch {
      // A driver that reports WebGL but cannot actually compile the shaders.
      setMode('static');
      return;
    }

    controllerRef.current = controller;
    setMode('live');
    setReplayable(!reducedMotion);

    // -------------------------------------------------- scroll choreography
    // rAF-throttled: a scroll handler that touches layout on every event is
    // the classic way to make a page feel heavy.
    let queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const rect = stage!.getBoundingClientRect();
        // 0 while the stage is fully in place, 1 once it has travelled its own
        // height upward out of the viewport.
        const travelled = -rect.top;
        const span = rect.height * 0.9 || 1;
        controller.setScrollProgress(travelled / span);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // -------------------------------------------------- visibility
    // Off-screen or in a background tab, nothing is drawn at all.
    const io = new IntersectionObserver(
      ([entry]) => controller.setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(stage);

    function onVisibility() {
      controller.setVisible(!document.hidden);
    }
    document.addEventListener('visibilitychange', onVisibility);

    // -------------------------------------------------- theme
    function onTheme(e: Event) {
      controller.setTheme((e as CustomEvent<'light' | 'dark'>).detail);
    }
    window.addEventListener('warka:themechange', onTheme);

    // -------------------------------------------------- resize
    const ro = new ResizeObserver(() => controller.resize());
    ro.observe(stage);

    // -------------------------------------------------- context loss
    function onContextLost(e: Event) {
      e.preventDefault();
      setMode('static');
    }
    canvas.addEventListener('webglcontextlost', onContextLost);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('warka:themechange', onTheme);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      io.disconnect();
      ro.disconnect();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Pointer drag and arrow keys nudge the sign a little. Bounded, so it can
  // never be spun into an unreadable position.
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const dx = (e.clientX - lastPoint.current.x) * 0.006;
    const dy = (e.clientY - lastPoint.current.y) * 0.004;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    controllerRef.current?.nudge(-dx, dy);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = 0.14;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, -step * 0.6],
      ArrowDown: [0, step * 0.6],
    };
    const move = moves[e.key];
    // Only the arrows. The wheel and the space bar always scroll the page.
    if (!move) return;
    e.preventDefault();
    controllerRef.current?.nudge(move[0], move[1]);
  }, []);

  return (
    <div className={styles.stage} ref={stageRef}>
      <div className={styles.ghost} aria-hidden="true">
        <span className="dsp">WARKA</span>
      </div>

      {mode !== 'static' && (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label="The Warka Furniture sign built in three dimensions — the warka tree cut as fretwork beside the Amharic name ዋርካ, የአንጨት ስራዎች. Drag it or use the arrow keys to turn it."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          data-ready={mode === 'live'}
        />
      )}

      {mode === 'static' && (
        <div className={styles.fallback}>
          <Image
            src="/brand/logo.jpg"
            alt="The Warka Furniture sign: the warka tree cut as fretwork beside the Amharic name ዋርካ, የአንጨት ስራዎች"
            width={221}
            height={163}
            priority
            className={styles.fallbackImage}
          />
        </div>
      )}

      {mode === 'live' && (
        <>
          <span className={styles.hint} aria-hidden="true">
            Drag to turn
          </span>
          {replayable && (
            <button
              type="button"
              className={styles.replay}
              onClick={() => controllerRef.current?.replay()}
            >
              Replay
            </button>
          )}
        </>
      )}
    </div>
  );
}
