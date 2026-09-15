'use client';

import { useRef, useState } from 'react';

import styles from './SortableList.module.css';

/**
 * Drag to reorder.
 *
 * Built on the browser's own drag-and-drop rather than pointer maths, which
 * buys the native drag image and autoscroll for free and keeps the whole thing
 * under a hundred lines with no dependency. The drop indicator is a line drawn
 * on the item you are hovering, above or below depending on which half of it
 * the cursor is in — so where the thing will land is never a guess.
 *
 * Dragging is not usable with a keyboard, so every row also gets Move up and
 * Move down buttons. They are not a fallback nobody tests: they are the same
 * reorder call the drag makes.
 */
export type SortableRenderArgs = {
  index: number;
  isDragging: boolean;
  /** Spread onto the element that should start a drag. */
  handleProps: {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    className: string;
    'aria-label': string;
  };
  moveUp: () => void;
  moveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function SortableList<T>({
  items,
  getKey,
  onReorder,
  children,
  label,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  onReorder: (nextOrder: T[]) => void;
  children: (item: T, args: SortableRenderArgs) => React.ReactNode;
  label: string;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; below: boolean } | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    if (liveRef.current) {
      liveRef.current.textContent = `Moved to position ${to + 1} of ${items.length}.`;
    }
  }

  return (
    <div className={styles.list} role="list" aria-label={label}>
      {items.map((item, index) => {
        const isDragging = dragging === index;
        const showLineAbove = over?.index === index && !over.below;
        const showLineBelow = over?.index === index && over.below;

        return (
          <div
            key={getKey(item, index)}
            role="listitem"
            className={styles.row}
            data-dragging={isDragging}
            data-line-above={showLineAbove}
            data-line-below={showLineBelow}
            onDragOver={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const box = e.currentTarget.getBoundingClientRect();
              setOver({ index, below: e.clientY > box.top + box.height / 2 });
            }}
            onDragLeave={(e) => {
              // Only clear when the cursor has actually left this row, not when
              // it crosses onto a child inside it.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOver((prev) => (prev?.index === index ? null : prev));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging === null || !over) return;
              // Removing the dragged row first shifts everything after it up by
              // one, so a downward move needs its target decremented.
              const target = over.below ? over.index + 1 : over.index;
              move(dragging, dragging < target ? target - 1 : target);
              setDragging(null);
              setOver(null);
            }}
          >
            {children(item, {
              index,
              isDragging,
              handleProps: {
                draggable: true,
                onDragStart: (e: React.DragEvent) => {
                  setDragging(index);
                  e.dataTransfer.effectAllowed = 'move';
                  // Firefox refuses to start a drag without payload.
                  e.dataTransfer.setData('text/plain', String(index));
                },
                onDragEnd: () => {
                  setDragging(null);
                  setOver(null);
                },
                className: styles.handle,
                'aria-label': 'Drag to reorder',
              },
              moveUp: () => move(index, index - 1),
              moveDown: () => move(index, index + 1),
              canMoveUp: index > 0,
              canMoveDown: index < items.length - 1,
            })}
          </div>
        );
      })}
      <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />
    </div>
  );
}

/** The six-dot grip, and the two buttons that do the same job by keyboard. */
export function DragHandle({ args }: { args: SortableRenderArgs }) {
  return (
    <span className={styles.handleGroup}>
      <span {...args.handleProps}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>
      </span>
      <span className={styles.arrows}>
        <button type="button" onClick={args.moveUp} disabled={!args.canMoveUp} aria-label="Move up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M7 14l5-5 5 5" />
          </svg>
        </button>
        <button type="button" onClick={args.moveDown} disabled={!args.canMoveDown} aria-label="Move down">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </button>
      </span>
    </span>
  );
}
