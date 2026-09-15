'use client';

import { useId } from 'react';

import styles from './Fields.module.css';

/**
 * The form controls the whole admin is built from.
 *
 * Every one takes a value and an onChange rather than a form name: the settings
 * pages hold their draft in React state so that Save, Discard and the dirty
 * indicator all have something real to talk about.
 *
 * `advanced` marks a control that only appears in Advanced mode. Simple mode is
 * the default because most days the shop wants to change a word, not a
 * letter-spacing.
 */

export function Field({
  label,
  hint,
  children,
  advanced,
  mode = 'simple',
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
  wide?: boolean;
}) {
  if (advanced && mode !== 'advanced') return null;
  return (
    <div className={styles.field} data-wide={wide}>
      <label className={styles.label}>
        <span className={styles.labelText}>
          {label}
          {advanced && <span className={styles.advancedTag}>advanced</span>}
        </span>
        {children}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength,
  advanced,
  mode,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
  wide?: boolean;
}) {
  return (
    <Field label={label} hint={hint} advanced={advanced} mode={mode} wide={wide}>
      <input
        type="text"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  maxLength,
  advanced,
  mode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  return (
    <Field label={label} hint={hint} advanced={advanced} mode={mode} wide>
      <textarea
        className={styles.textarea}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  step = 1,
  suffix,
  advanced,
  mode,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  return (
    <Field label={label} hint={hint} advanced={advanced} mode={mode}>
      <span className={styles.withSuffix}>
        <input
          type="number"
          className={styles.input}
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            // An empty box reads as NaN. Treat it as the floor rather than
            // writing NaN into the settings and failing validation later.
            onChange(Number.isFinite(n) ? n : (min ?? 0));
          }}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
    </Field>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  advanced,
  mode,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  return (
    <Field label={label} hint={hint} advanced={advanced} mode={mode} wide>
      <span className={styles.sliderRow}>
        <input
          type="range"
          className={styles.range}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <input
          type="number"
          className={styles.sliderNumber}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
          }}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </span>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  advanced,
  mode,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  hint?: string;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  return (
    <Field label={label} hint={hint} advanced={advanced} mode={mode}>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
  hint,
  advanced,
  mode,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  if (advanced && mode !== 'advanced') return null;
  return (
    <div className={styles.field} data-wide>
      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleLabel}>{label}</span>
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

export function ColourField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  advanced,
  mode,
}: {
  label: string;
  /** Empty means "not set" — the stylesheet's own value stands. */
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  advanced?: boolean;
  mode?: 'simple' | 'advanced';
}) {
  const id = useId();
  if (advanced && mode !== 'advanced') return null;

  // <input type=color> only understands #rrggbb. A stored rgba() is perfectly
  // valid and simply cannot be shown in the swatch, so the text box stays
  // authoritative and the swatch falls back to the placeholder.
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : /^#[0-9a-fA-F]{6}$/.test(placeholder ?? '') ? placeholder! : '#000000';

  return (
    <div className={styles.field}>
      <span className={styles.labelText} id={`${id}-label`}>
        {label}
      </span>
      <span className={styles.colourRow}>
        <input
          type="color"
          className={styles.swatch}
          value={hex}
          aria-labelledby={`${id}-label`}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={styles.input}
          value={value}
          placeholder={placeholder}
          aria-labelledby={`${id}-label`}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange('')}
            title="Use the site default"
          >
            Reset
          </button>
        )}
      </span>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: 'simple' | 'advanced';
  onChange: (m: 'simple' | 'advanced') => void;
}) {
  return (
    <div className={styles.modeSwitch} role="group" aria-label="How many settings to show">
      {(['simple', 'advanced'] as const).map((m) => (
        <button
          key={m}
          type="button"
          data-active={mode === m}
          onClick={() => onChange(m)}
          className={styles.modeButton}
        >
          {m === 'simple' ? 'Simple' : 'Advanced'}
        </button>
      ))}
    </div>
  );
}
