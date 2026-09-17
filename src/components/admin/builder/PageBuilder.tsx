'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { publishPageAction, savePageBlocksAction } from '@/app/actions/admin-pages';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import { asText } from '@/lib/text';
import {
  BLOCK_LIBRARY,
  newBlockWithStarter,
  type Block,
  type BlockType,
} from '@/lib/site/blocks';
import { BlockProperties } from './BlockProperties';
import styles from './Builder.module.css';

type Device = 'desktop' | 'tablet' | 'mobile';
const WIDTHS: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };

const GROUPS = ['Text', 'Media', 'Shop', 'Layout', 'More'] as const;

/**
 * The visual editor.
 *
 * The middle panel is an iframe showing /preview/<page>, which is the same
 * renderer, the same data and the same stylesheet the public page uses. That
 * is deliberate: a canvas that approximates the page is a canvas that lies,
 * and the whole point of a builder is seeing what you will actually ship.
 *
 * Because the preview is server-rendered, it refreshes after a save rather
 * than on every keystroke. Structure — adding, reordering, deleting — is
 * reflected instantly in the outline on the left, which is where those
 * actions happen anyway.
 */
export function PageBuilder({
  pageId,
  pageTitle,
  pageSlug,
  initialBlocks,
  hasUnpublished,
  media,
  categories,
  products,
}: {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  initialBlocks: Block[];
  hasUnpublished: boolean;
  media: { url: string; filename: string }[];
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(initialBlocks[0]?.id ?? null);
  const [device, setDevice] = useState<Device>('desktop');
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [panel, setPanel] = useState<'canvas' | 'blocks' | 'settings'>('canvas');
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'dirty' | 'error'>(
    hasUnpublished ? 'saved' : 'idle',
  );
  const [unpublished, setUnpublished] = useState(hasUnpublished);
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Undo/redo: snapshots of the whole document, which is cheap at this size and
  // impossible to get subtly wrong. Held in state rather than refs, because the
  // Undo and Redo buttons are disabled from their lengths — a ref does not
  // re-render, so those buttons would show whatever was true at the last render
  // for some other reason. It happened to be right, in the order things
  // currently run; "happened to be right" is not a property worth keeping.
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const touched = useRef(false);
  const timer = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const commit = useCallback((next: Block[]) => {
    // The functional form reads the value React is about to render from, not
    // the one this closure was built with, so a fast second edit cannot push a
    // stale snapshot onto the stack.
    setBlocks((previous) => {
      setPast((p) => [...p.slice(-49), previous]);
      return next;
    });
    setFuture([]);
    touched.current = true;
    setSave('dirty');
  }, []);

  const persist = useCallback(
    async (next: Block[]) => {
      setSave('saving');
      const result = await savePageBlocksAction(pageId, next);
      if (result?.ok) {
        setSave('saved');
        setUnpublished(true);
        // Only now is it worth reloading the preview: it reads the draft from
        // the database, so refreshing before the save would show the old one.
        // Guarded because a frame that failed to load throws on access, and a
        // preview problem must never be able to stop a save or a publish.
        try {
          iframeRef.current?.contentWindow?.location.reload();
        } catch {
          setMessage('Saved. The preview could not refresh itself — reload the page to see it.');
        }
      } else {
        setSave('error');
        setMessage(result?.message ?? 'Could not save.');
      }
    },
    [pageId],
  );

  useEffect(() => {
    if (!touched.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(blocks), 900);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [blocks, persist]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (save === 'dirty' || save === 'saving') e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [save]);

  // Clicking a block in the preview selects it here. Same origin, so the
  // iframe's document is readable directly — no message passing needed.
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    function attach() {
      let doc: Document | null = null;
      try {
        doc = frame?.contentDocument ?? null;
      } catch {
        // Blocked. The outline on the left still edits the page.
        return;
      }
      if (!doc) return;
      doc.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement | null)?.closest('[data-block-id]');
        const id = target?.getAttribute('data-block-id');
        if (id) {
          e.preventDefault();
          setSelectedId(id);
          setPanel('settings');
        }
      });
      // A faint outline on hover, so it is obvious the preview is clickable.
      const style = doc.createElement('style');
      style.textContent =
        '[data-block-id]{cursor:pointer}[data-block-id]:hover{outline:2px solid #bc431e;outline-offset:-2px}';
      doc.head?.appendChild(style);
    }

    frame.addEventListener('load', attach);
    return () => frame.removeEventListener('load', attach);
  }, []);

  function undo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [blocks, ...f.slice(0, 49)]);
    touched.current = true;
    setBlocks(previous);
    setSave('dirty');
  }

  function redo() {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setPast((p) => [...p, blocks]);
    touched.current = true;
    setBlocks(next);
    setSave('dirty');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // No dependency array on purpose: the handler closes over blocks, past and
    // future, and must be rebound whenever any of them changes or Ctrl-Z would
    // undo to whatever the document looked like when the page opened.
  });

  function add(type: BlockType) {
    const block = newBlockWithStarter(type);
    const at = selectedId ? blocks.findIndex((b) => b.id === selectedId) + 1 : blocks.length;
    const next = [...blocks.slice(0, at), block, ...blocks.slice(at)];
    commit(next);
    setSelectedId(block.id);
    setPanel('settings');
  }

  function patch(id: string, updater: (b: Block) => Block) {
    commit(blocks.map((b) => (b.id === id ? updater(b) : b)));
  }

  function remove(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    if (!window.confirm('Delete this block? You can undo it with Ctrl-Z.')) return;
    commit(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicate(id: string) {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const copy: Block = {
      ...structuredClone(blocks[index]),
      id: `b-${Math.random().toString(36).slice(2, 10)}`,
    };
    commit([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
    setSelectedId(copy.id);
  }

  function move(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((b) => b.id === id);
    const to = index + direction;
    if (index === -1 || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    commit(next);
  }

  /**
   * Hide is not delete. A hidden block keeps its content and its settings and
   * simply stops rendering, on every device at once — which is what somebody
   * means when they take a section off the page for a week.
   */
  function setHidden(id: string, hidden: boolean) {
    patch(id, (b) => ({
      ...b,
      style: {
        ...b.style,
        showOnDesktop: !hidden,
        showOnTablet: !hidden,
        showOnMobile: !hidden,
      },
    }));
  }

  async function publish() {
    setPublishing(true);
    setMessage('');
    if (timer.current) window.clearTimeout(timer.current);
    await persist(blocks);
    const result = await publishPageAction(pageId);
    setPublishing(false);
    setMessage(result?.message ?? '');
    if (result?.ok) {
      setUnpublished(false);
      setSave('idle');
    }
  }

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const statusText =
    save === 'saving'
      ? 'Saving…'
      : save === 'dirty'
        ? 'Unsaved changes'
        : save === 'error'
          ? 'Not saved'
          : unpublished
            ? 'Draft saved, not published'
            : 'Everything is published';

  return (
    <div className={styles.builder}>
      {/* ------------------------------------------------------------ top */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Link href="/admin/pages" className={styles.back}>
            ← Pages
          </Link>
          <span className={styles.pageName}>{pageTitle}</span>
          <span className={styles.slug}>/{pageSlug}</span>
        </div>

        <div className={styles.devices} role="group" aria-label="Preview size">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
            <button key={d} type="button" data-active={device === d} onClick={() => setDevice(d)}>
              {d === 'desktop' ? 'Computer' : d === 'tablet' ? 'Tablet' : 'Phone'}
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <button type="button" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl-Z)">
            Undo
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl-Shift-Z)">
            Redo
          </button>
          <a href={`/preview/${pageId}`} target="_blank" rel="noopener noreferrer" className={styles.ghost}>
            Preview
          </a>
          <button type="button" className={styles.publish} onClick={publish} disabled={publishing || save === 'saving'}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>

      <div className={styles.statusBar}>
        <span className={styles.dot} data-state={save} data-unpublished={unpublished} aria-hidden="true" />
        <span role="status">{statusText}</span>
        {message && <span className={styles.message}>{message}</span>}
        <span className={styles.spacer} />
        <div className={styles.modeSwitch}>
          {(['simple', 'advanced'] as const).map((m) => (
            <button key={m} type="button" data-active={mode === m} onClick={() => setMode(m)}>
              {m === 'simple' ? 'Simple' : 'Advanced'}
            </button>
          ))}
        </div>
      </div>

      {/* On a phone the three panels become three tabs. */}
      <nav className={styles.tabs} aria-label="Builder panels">
        {(['blocks', 'canvas', 'settings'] as const).map((t) => (
          <button key={t} type="button" data-active={panel === t} onClick={() => setPanel(t)}>
            {t === 'blocks' ? 'Blocks' : t === 'canvas' ? 'Preview' : 'Settings'}
          </button>
        ))}
      </nav>

      <div className={styles.panes}>
        {/* ------------------------------------------------------- left */}
        <aside className={styles.left} data-open={panel === 'blocks'}>
          <section className={styles.paneSection}>
            <h2 className={styles.paneTitle}>Add a block</h2>
            {GROUPS.map((group) => (
              <div key={group} className={styles.libraryGroup}>
                <p className={styles.libraryGroupName}>{group}</p>
                <div className={styles.libraryGrid}>
                  {BLOCK_LIBRARY.filter((b) => b.group === group).map((b) => (
                    <button
                      key={b.type}
                      type="button"
                      className={styles.libraryItem}
                      title={b.hint}
                      onClick={() => add(b.type)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className={styles.paneSection}>
            <h2 className={styles.paneTitle}>This page</h2>
            {blocks.length === 0 ? (
              <p className={styles.hint}>
                Nothing here yet. Add a block above and it appears in the preview.
              </p>
            ) : (
              <SortableList
                items={blocks}
                label="Blocks on this page"
                getKey={(b) => b.id}
                onReorder={(next) => commit(next)}
              >
                {(block, args) => {
                  const hidden =
                    !block.style.showOnDesktop && !block.style.showOnTablet && !block.style.showOnMobile;
                  const index = blocks.findIndex((b) => b.id === block.id);

                  return (
                    <div
                      className={styles.outlineRow}
                      data-selected={block.id === selectedId}
                      data-hidden={hidden}
                    >
                      <DragHandle args={args} />
                      <button
                        type="button"
                        className={styles.outlineName}
                        onClick={() => {
                          setSelectedId(block.id);
                          setPanel('settings');
                        }}
                      >
                        <span>{BLOCK_LIBRARY.find((l) => l.type === block.type)?.label ?? block.type}</span>
                        <small>{hidden ? 'Hidden' : summarise(block)}</small>
                      </button>

                      <div className={styles.rowTools}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Move up"
                          aria-label="Move up"
                          disabled={index <= 0}
                          onClick={() => move(block.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Move down"
                          aria-label="Move down"
                          disabled={index === blocks.length - 1}
                          onClick={() => move(block.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title={hidden ? 'Show on the page' : 'Hide from the page'}
                          aria-label={hidden ? 'Show on the page' : 'Hide from the page'}
                          aria-pressed={hidden}
                          onClick={() => setHidden(block.id, !hidden)}
                        >
                          {hidden ? '🙈' : '👁'}
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Duplicate"
                          aria-label="Duplicate"
                          onClick={() => duplicate(block.id)}
                        >
                          ⧉
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Delete"
                          aria-label="Delete"
                          onClick={() => remove(block.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                }}
              </SortableList>
            )}
          </section>
        </aside>

        {/* ----------------------------------------------------- centre */}
        <main className={styles.canvas} data-open={panel === 'canvas'}>
          <div className={styles.frameWrap} data-device={device}>
            <iframe
              ref={iframeRef}
              src={`/preview/${pageId}?bare=1`}
              title="Live preview of this page"
              className={styles.frame}
              style={{ width: WIDTHS[device] }}
            />
          </div>
          <p className={styles.canvasNote}>
            This is the real page, rendered by the same code a visitor gets. Click anything in it to
            edit that block.
          </p>
        </main>

        {/* ------------------------------------------------------ right */}
        <aside className={styles.right} data-open={panel === 'settings'}>
          {selected ? (
            <>
              <div className={styles.rightHead}>
                <h2 className={styles.paneTitle}>
                  {BLOCK_LIBRARY.find((l) => l.type === selected.type)?.label ?? selected.type}
                </h2>
                <button type="button" className={styles.iconBtn} onClick={() => remove(selected.id)} title="Delete">
                  ✕
                </button>
              </div>
              <BlockProperties
                block={selected}
                mode={mode}
                media={media}
                categories={categories}
                products={products}
                onChange={(updater) => patch(selected.id, updater)}
              />
            </>
          ) : (
            <p className={styles.hint}>
              Pick a block — in the preview, or from the list on the left — and its settings appear
              here.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/** One line of whatever is actually in the block, for the outline. */
function summarise(block: Block): string {
  const p = block.props;
  const first =
    asText(p.heading) || asText(p.text) || asText(p.label) || asText(p.title) || asText(p.alt);
  if (first) return first.slice(0, 44);
  if (Array.isArray(p.items)) return `${p.items.length} item${p.items.length === 1 ? '' : 's'}`;
  if (Array.isArray(p.images)) return `${p.images.length} picture${p.images.length === 1 ? '' : 's'}`;
  if (p.url) return asText(p.url).slice(0, 44);
  return '';
}
