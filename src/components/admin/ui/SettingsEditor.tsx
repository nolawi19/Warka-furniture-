'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  discardSettingDraftAction,
  publishSettingAction,
  saveSettingDraftAction,
} from '@/app/actions/site-settings';
import { ModeSwitch } from './Fields';
import styles from './SettingsEditor.module.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

/**
 * The frame every settings page sits in.
 *
 * It owns the one workflow the whole admin shares: edit a draft, autosave it,
 * look at it, publish it. Two rules it enforces so no page has to remember
 * them —
 *
 *   - autosave writes the DRAFT and never the published copy, so a half-made
 *     change cannot reach a customer;
 *   - leaving with an unsaved edit warns first.
 */
export function SettingsEditor<T>({
  settingKey,
  initial,
  hasUnpublishedDraft,
  previewPath = '/',
  children,
  description,
}: {
  settingKey: string;
  initial: T;
  hasUnpublishedDraft: boolean;
  previewPath?: string;
  description?: string;
  children: (value: T, set: (updater: (prev: T) => T) => void, mode: 'simple' | 'advanced') => React.ReactNode;
}) {
  const [value, setValue] = useState<T>(initial);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [save, setSave] = useState<SaveState>(hasUnpublishedDraft ? 'saved' : 'idle');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [unpublished, setUnpublished] = useState(hasUnpublishedDraft);

  // The first render must not look like an edit, or every page would autosave
  // itself the moment it opened. Counted in state rather than flagged in a
  // ref, because `set` is handed to the editors while they render.
  const [edits, setEdits] = useState(0);
  const timer = useRef<number | null>(null);

  const persist = useCallback(
    async (next: T) => {
      setSave('saving');
      const result = await saveSettingDraftAction(settingKey, next);
      if (result?.ok) {
        setSave('saved');
        setUnpublished(true);
        setMessage('');
      } else {
        setSave('error');
        setMessage(result?.message ?? 'Could not save those changes.');
      }
    },
    [settingKey],
  );

  const set = useCallback((updater: (prev: T) => T) => {
    setEdits((n) => n + 1);
    setValue((prev) => updater(prev));
    setSave('dirty');
  }, []);

  // Autosave, debounced. A colour picker fires on every drag; one write per
  // pause is enough.
  useEffect(() => {
    if (edits === 0) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(value), 900);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, edits, persist]);

  // The browser's own warning is the only one that can block a close.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (save === 'dirty' || save === 'saving') e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [save]);

  async function publish() {
    setPublishing(true);
    setMessage('');
    // Flush anything still pending, so Publish never ships the version from
    // before the last keystroke.
    if (timer.current) window.clearTimeout(timer.current);
    await persist(value);
    const result = await publishSettingAction(settingKey);
    setPublishing(false);
    if (result?.ok) {
      setUnpublished(false);
      setSave('idle');
      setMessage(result.message);
    } else {
      setMessage(result?.message ?? 'Could not publish.');
    }
  }

  async function discard() {
    if (!window.confirm('Throw away this draft and go back to what is live?')) return;
    const result = await discardSettingDraftAction(settingKey);
    setMessage(result?.message ?? '');
    if (result?.ok) window.location.reload();
  }

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
    <div className={styles.editor}>
      <div className={styles.bar}>
        <div className={styles.status}>
          <span className={styles.dot} data-state={save} data-unpublished={unpublished} aria-hidden="true" />
          <span role="status" className={styles.statusText}>
            {statusText}
          </span>
        </div>

        <div className={styles.controls}>
          <ModeSwitch mode={mode} onChange={setMode} />
          <a href={previewPath} target="_blank" rel="noopener noreferrer" className={styles.ghostButton}>
            Preview
          </a>
          {unpublished && (
            <button type="button" className={styles.ghostButton} onClick={discard}>
              Discard draft
            </button>
          )}
          <button
            type="button"
            className={styles.publishButton}
            onClick={publish}
            disabled={publishing || save === 'saving'}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {description && <p className={styles.description}>{description}</p>}

      {message && (
        <p className={styles.message} data-tone={save === 'error' ? 'error' : 'ok'} role="status">
          {message}
        </p>
      )}

      <div className={styles.body}>{children(value, set, mode)}</div>
    </div>
  );
}
