'use client';

import { ANIMATIONS } from '@/lib/site/schemas';
import type { Block } from '@/lib/site/blocks';
import { asText } from '@/lib/text';
import styles from './Builder.module.css';

/**
 * Everything about the selected block, in sections that open and close.
 *
 * Content first, because that is what somebody opened the panel to change.
 * The technical controls — exact widths, per-device visibility, animation
 * timing — only appear in Advanced mode, so the common job stays four fields.
 */

type Patch = (updater: (block: Block) => Block) => void;

export function BlockProperties({
  block,
  onChange,
  mode,
  media,
  categories,
  products,
}: {
  block: Block;
  onChange: Patch;
  mode: 'simple' | 'advanced';
  media: { url: string; filename: string }[];
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
}) {
  const p = block.props;

  const setProp = (key: string, value: unknown) =>
    onChange((b) => ({ ...b, props: { ...b.props, [key]: value } }));
  const setStyle = (key: string, value: unknown) =>
    onChange((b) => ({ ...b, style: { ...b.style, [key]: value } }));
  const setAnim = (key: string, value: unknown) =>
    onChange((b) => ({ ...b, animation: { ...b.animation, [key]: value } }));

  const text = (key: string, label: string, hint?: string) => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <input
        className={styles.input}
        value={asText(p[key])}
        onChange={(e) => setProp(key, e.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );

  const area = (key: string, label: string, rows = 4) => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <textarea
        className={styles.textarea}
        rows={rows}
        value={asText(p[key])}
        onChange={(e) => setProp(key, e.target.value)}
      />
      <small>A blank line starts a new paragraph.</small>
    </label>
  );

  const num = (key: string, label: string, min: number, max: number, suffix?: string) => (
    <label className={styles.field} key={key}>
      <span>
        {label} {suffix && <em>{suffix}</em>}
      </span>
      <input
        className={styles.input}
        type="number"
        min={min}
        max={max}
        value={Number(p[key] ?? 0)}
        onChange={(e) => setProp(key, Math.min(max, Math.max(min, e.target.valueAsNumber || 0)))}
      />
    </label>
  );

  const pick = (key: string, label: string, options: { value: string; label: string }[]) => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <select className={styles.input} value={asText(p[key])} onChange={(e) => setProp(key, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  const toggle = (key: string, label: string) => (
    <label className={styles.checkRow} key={key}>
      <input type="checkbox" checked={Boolean(p[key])} onChange={(e) => setProp(key, e.target.checked)} />
      {label}
    </label>
  );

  const imageField = (key: string, label: string) => (
    <label className={styles.field} key={key}>
      <span>{label}</span>
      <input
        className={styles.input}
        value={asText(p[key])}
        list="builder-media"
        placeholder="/uploads/…"
        onChange={(e) => setProp(key, e.target.value)}
      />
      <small>
        Type to search the media library, or paste an address.{' '}
        <a href="/admin/media" target="_blank" rel="noopener noreferrer">
          Upload
        </a>
      </small>
      {asText(p[key]) && (
         
        // whatever the admin typed, at an unknown size.
         
        // whatever address the admin typed, at a size nothing knows in advance.
        <img src={asText(p[key])} alt="" className={styles.thumb} />
      )}
    </label>
  );

  /** Editing a list of sub-items — columns, gallery, FAQ, testimonials. */
  function listEditor(
    key: string,
    label: string,
    fields: { key: string; label: string; area?: boolean; image?: boolean }[],
    max: number,
    blank: Record<string, string>,
  ) {
    const items = (Array.isArray(p[key]) ? p[key] : []) as Record<string, string>[];
    return (
      <div className={styles.listEditor} key={key}>
        <div className={styles.listHead}>
          <span>{label}</span>
          {items.length < max && (
            <button type="button" className={styles.smallButton} onClick={() => setProp(key, [...items, blank])}>
              + Add
            </button>
          )}
        </div>
        {items.length === 0 && <p className={styles.hint}>Nothing yet. Add the first one.</p>}
        {items.map((item, i) => (
          <div key={i} className={styles.listItem}>
            <div className={styles.listItemHead}>
              <span>{i + 1}</span>
              <div className={styles.listItemButtons}>
                <button
                  type="button"
                  disabled={i === 0}
                  aria-label="Move up"
                  onClick={() => {
                    const next = [...items];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setProp(key, next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                  onClick={() => {
                    const next = [...items];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    setProp(key, next);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setProp(key, items.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            </div>
            {fields.map((f) => (
              <label className={styles.field} key={f.key}>
                <span>{f.label}</span>
                {f.area ? (
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={item[f.key] ?? ''}
                    onChange={(e) =>
                      setProp(key, items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))
                    }
                  />
                ) : (
                  <input
                    className={styles.input}
                    value={item[f.key] ?? ''}
                    list={f.image ? 'builder-media' : undefined}
                    onChange={(e) =>
                      setProp(key, items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))
                    }
                  />
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const content = (() => {
    switch (block.type) {
      case 'hero':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('heading', 'Heading')}
            {area('body', 'Text', 3)}
            {text('primaryLabel', 'Button text')}
            {text('primaryHref', 'Button link')}
            {text('secondaryLabel', 'Second button text')}
            {text('secondaryHref', 'Second button link')}
            {listEditor(
              'facts',
              'Short facts under the buttons',
              [
                { key: 'value', label: 'The fact' },
                { key: 'label', label: 'The note under it' },
              ],
              4,
              { value: '', label: '' },
            )}
            {pick('panel', 'Beside the text', [
              { value: 'plate', label: 'The Warka name plate' },
              { value: 'image', label: 'A photograph' },
              { value: 'none', label: 'Nothing — text across the width' },
            ])}
            {p.panel === 'plate' && (
              <>
                {text('plateKicker', 'Line at the top of the plate')}
                {text('wordmarkMain', 'Name')}
                {text('wordmarkSub', 'Under the name')}
                {text('amharic', 'In Amharic')}
                {area('plateNote', 'Note at the foot of the plate', 2)}
              </>
            )}
            {p.panel === 'image' && (
              <>
                {imageField('imageUrl', 'Picture')}
                {text('imageAlt', 'Picture description')}
              </>
            )}
          </>
        );
      case 'heading':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('text', 'Heading')}
            {pick('level', 'Size', [
              { value: 'h1', label: 'Biggest (h1)' },
              { value: 'h2', label: 'Section (h2)' },
              { value: 'h3', label: 'Sub-section (h3)' },
              { value: 'h4', label: 'Small (h4)' },
            ])}
          </>
        );
      case 'paragraph':
        return (
          <>
            {area('text', 'Text', 8)}
            {pick('size', 'Size', [
              { value: 'small', label: 'Small' },
              { value: 'body', label: 'Normal' },
              { value: 'large', label: 'Large' },
            ])}
          </>
        );
      case 'image':
        return (
          <>
            {imageField('url', 'Picture')}
            {text('alt', 'Description for screen readers')}
            {text('caption', 'Caption')}
            {pick('aspect', 'Shape', [
              { value: 'auto', label: 'Whatever the picture is' },
              { value: '16/9', label: 'Wide (16:9)' },
              { value: '4/3', label: 'Landscape (4:3)' },
              { value: '1/1', label: 'Square' },
              { value: '3/4', label: 'Portrait (3:4)' },
            ])}
            {pick('fit', 'Fit', [
              { value: 'cover', label: 'Fill the box, crop if needed' },
              { value: 'contain', label: 'Show all of it' },
              { value: 'fill', label: 'Stretch to fit' },
            ])}
            {mode === 'advanced' && num('height', 'Fixed height', 0, 1200, 'px, 0 = auto')}
          </>
        );
      case 'imageText':
        return (
          <>
            {imageField('imageUrl', 'Picture')}
            {text('imageAlt', 'Picture description')}
            {text('heading', 'Heading')}
            {area('body', 'Text', 5)}
            {text('linkLabel', 'Link text')}
            {text('linkHref', 'Link address')}
            {pick('imageSide', 'Picture on the', [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ])}
          </>
        );
      case 'columns':
        return (
          <>
            {pick('count', 'How many columns', [
              { value: '2', label: 'Two' },
              { value: '3', label: 'Three' },
            ])}
            {listEditor(
              'items',
              'Columns',
              [
                { key: 'heading', label: 'Heading' },
                { key: 'body', label: 'Text', area: true },
                { key: 'imageUrl', label: 'Picture', image: true },
              ],
              3,
              { heading: '', body: '', imageUrl: '' },
            )}
          </>
        );
      case 'productGrid':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('heading', 'Heading')}
            {pick('source', 'Which products', [
              { value: 'featured', label: 'The ones marked featured' },
              { value: 'photographed', label: 'The ones with a photograph' },
              { value: 'newest', label: 'Most recently added' },
              { value: 'category', label: 'From one category' },
            ])}
            {p.source === 'category' && (
              <label className={styles.field}>
                <span>Category</span>
                <select
                  className={styles.input}
                  value={asText(p.categorySlug)}
                  onChange={(e) => setProp('categorySlug', e.target.value)}
                >
                  <option value="">Choose one</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {num('limit', 'How many', 1, 24)}
            {text('linkLabel', 'Link text')}
            {text('linkHref', 'Link address')}
            <div className={styles.deviceCols}>
              {num('columnsDesktop', 'Columns on a computer', 1, 6)}
              {num('columnsTablet', 'On a tablet', 1, 4)}
              {num('columnsMobile', 'On a phone', 1, 3)}
            </div>
          </>
        );
      case 'categoryGrid':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('heading', 'Heading')}
            {num('limit', 'How many', 1, 12)}
            {text('linkLabel', 'Link text')}
            {text('linkHref', 'Link address')}
            {toggle('showCounts', 'Show how many pieces are in each')}
            <p className={styles.hint}>
              The panel fits as many across as the space allows, the same way it does on the
              homepage.
            </p>
          </>
        );
      case 'steps':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('heading', 'Heading')}
            {text('note', 'Small note on the right')}
            {listEditor(
              'items',
              'Steps',
              [
                { key: 'n', label: 'Number' },
                { key: 't', label: 'Title' },
                { key: 'd', label: 'Text', area: true },
              ],
              8,
              { n: '', t: '', d: '' },
            )}
          </>
        );
      case 'quote':
        return (
          <>
            {area('text', 'The line', 3)}
            {text('cite', 'Who said it')}
          </>
        );
      case 'storeInfo':
        return (
          <>
            {text('kicker', 'Small line above')}
            {text('heading', 'Heading')}
            {area('body', 'Text', 4)}
            {imageField('imageUrl', 'Picture')}
            {text('imageAlt', 'Picture description')}
            {toggle('showArea', 'Show where the shop is')}
            {toggle('showHours', 'Show the opening hours')}
            {toggle('showPhone', 'Show the phone number')}
            {toggle('showEmail', 'Show the email address')}
            {toggle('showDelivery', 'Show the delivery note')}
            {text('primaryLabel', 'Button text')}
            {text('primaryHref', 'Button link')}
            {text('secondaryLabel', 'Second button text')}
            {text('secondaryHref', 'Second button link')}
            <p className={styles.hint}>
              The details themselves come from Store settings, so they are only ever in one place.
            </p>
          </>
        );
      case 'featuredProduct':
        return (
          <>
            <label className={styles.field}>
              <span>Product</span>
              <select
                className={styles.input}
                value={asText(p.slug)}
                onChange={(e) => setProp('slug', e.target.value)}
              >
                <option value="">Choose one</option>
                {products.map((pr) => (
                  <option key={pr.slug} value={pr.slug}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </label>
            {text('heading', 'Small line above')}
            {area('body', 'Text instead of the product’s own description', 4)}
          </>
        );
      case 'gallery':
        return (
          <>
            {text('heading', 'Heading')}
            {listEditor(
              'images',
              'Pictures',
              [
                { key: 'url', label: 'Picture', image: true },
                { key: 'alt', label: 'Description' },
              ],
              24,
              { url: '', alt: '' },
            )}
            <div className={styles.deviceCols}>
              {num('columnsDesktop', 'Columns on a computer', 1, 6)}
              {num('columnsMobile', 'On a phone', 1, 3)}
            </div>
          </>
        );
      case 'testimonials':
        return (
          <>
            {text('heading', 'Heading')}
            {listEditor(
              'items',
              'What people said',
              [
                { key: 'quote', label: 'What they said', area: true },
                { key: 'name', label: 'Who' },
                { key: 'detail', label: 'Where or when' },
              ],
              12,
              { quote: '', name: '', detail: '' },
            )}
          </>
        );
      case 'faq':
        return (
          <>
            {text('heading', 'Heading')}
            {listEditor(
              'items',
              'Questions',
              [
                { key: 'question', label: 'Question' },
                { key: 'answer', label: 'Answer', area: true },
              ],
              24,
              { question: '', answer: '' },
            )}
          </>
        );
      case 'button':
        return (
          <>
            {text('label', 'Button text')}
            {text('href', 'Where it goes')}
            {pick('variant', 'Style', [
              { value: 'primary', label: 'Primary' },
              { value: 'ghost', label: 'Outline' },
              { value: 'quiet', label: 'Text only' },
            ])}
            {pick('size', 'Size', [
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Normal' },
              { value: 'lg', label: 'Large' },
            ])}
          </>
        );
      case 'newsletter':
        return (
          <>
            {text('heading', 'Heading')}
            {area('body', 'Text above the box', 3)}
          </>
        );
      case 'contact':
        return (
          <>
            {text('heading', 'Heading')}
            {area('body', 'Text', 3)}
            {toggle('showPhone', 'Show the phone number')}
            {toggle('showEmail', 'Show the email address')}
            {toggle('showAddress', 'Show the address')}
            <p className={styles.hint}>
              The details themselves come from Store settings, so they are only ever in one place.
            </p>
          </>
        );
      case 'video':
        return (
          <>
            {text('url', 'Embed address', 'The "embed" URL from YouTube or Vimeo, not the page address.')}
            {text('title', 'Title for screen readers')}
            {pick('aspect', 'Shape', [
              { value: '16/9', label: 'Wide (16:9)' },
              { value: '4/3', label: 'Landscape (4:3)' },
              { value: '1/1', label: 'Square' },
            ])}
          </>
        );
      case 'spacer':
        return num('height', 'Height', 4, 400, 'px');
      case 'divider':
        return pick('style', 'Style', [
          { value: 'line', label: 'A line' },
          { value: 'space', label: 'Just space' },
          { value: 'dots', label: 'Dots' },
        ]);
      default:
        return <p className={styles.hint}>This block has no settings.</p>;
    }
  })();

  const s = block.style;

  return (
    <div className={styles.props}>
      <datalist id="builder-media">
        {media.map((m) => (
          <option key={m.url} value={m.url}>
            {m.filename}
          </option>
        ))}
      </datalist>

      <details open className={styles.group}>
        <summary>Content</summary>
        <div className={styles.groupBody}>{content}</div>
      </details>

      <details className={styles.group}>
        <summary>Layout</summary>
        <div className={styles.groupBody}>
          <label className={styles.field}>
            <span>Width</span>
            <select className={styles.input} value={s.width} onChange={(e) => setStyle('width', e.target.value)}>
              <option value="narrow">Narrow — good for reading</option>
              <option value="wide">Wide — the usual page width</option>
              <option value="full">Edge to edge</option>
              <option value="custom">An exact width</option>
            </select>
          </label>
          {s.width === 'custom' && (
            <label className={styles.field}>
              <span>
                Exact width <em>px</em>
              </span>
              <input
                className={styles.input}
                type="number"
                min={200}
                max={2400}
                value={s.customWidth}
                onChange={(e) => setStyle('customWidth', e.target.valueAsNumber || 1000)}
              />
            </label>
          )}
          <label className={styles.field}>
            <span>Alignment</span>
            <select className={styles.input} value={s.align} onChange={(e) => setStyle('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centred</option>
              <option value="right">Right</option>
            </select>
          </label>
          {mode === 'advanced' && (
            <label className={styles.field}>
              <span>
                Smallest height <em>px, 0 = as tall as it needs</em>
              </span>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={1200}
                value={s.minHeight}
                onChange={(e) => setStyle('minHeight', e.target.valueAsNumber || 0)}
              />
            </label>
          )}
        </div>
      </details>

      <details className={styles.group}>
        <summary>Spacing</summary>
        <div className={styles.groupBody}>
          <label className={styles.field}>
            <span>
              Space above <em>{s.paddingTop}px</em>
            </span>
            <input
              type="range"
              min={0}
              max={200}
              step={4}
              value={s.paddingTop}
              onChange={(e) => setStyle('paddingTop', e.target.valueAsNumber)}
            />
          </label>
          <label className={styles.field}>
            <span>
              Space below <em>{s.paddingBottom}px</em>
            </span>
            <input
              type="range"
              min={0}
              max={200}
              step={4}
              value={s.paddingBottom}
              onChange={(e) => setStyle('paddingBottom', e.target.valueAsNumber)}
            />
          </label>
          {mode === 'advanced' && (
            <label className={styles.field}>
              <span>
                Space at the sides <em>{s.paddingX}px</em>
              </span>
              <input
                type="range"
                min={0}
                max={120}
                step={4}
                value={s.paddingX}
                onChange={(e) => setStyle('paddingX', e.target.valueAsNumber)}
              />
            </label>
          )}
        </div>
      </details>

      <details className={styles.group}>
        <summary>Colour</summary>
        <div className={styles.groupBody}>
          <label className={styles.field}>
            <span>Background</span>
            <span className={styles.colourRow}>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(s.background) ? s.background : '#ffffff'}
                onChange={(e) => setStyle('background', e.target.value)}
                aria-label="Background colour"
              />
              <input
                className={styles.input}
                value={s.background}
                placeholder="none"
                onChange={(e) => setStyle('background', e.target.value)}
              />
              {s.background && (
                <button type="button" className={styles.smallButton} onClick={() => setStyle('background', '')}>
                  Clear
                </button>
              )}
            </span>
          </label>
          <label className={styles.field}>
            <span>Text colour</span>
            <span className={styles.colourRow}>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(s.textColor) ? s.textColor : '#191814'}
                onChange={(e) => setStyle('textColor', e.target.value)}
                aria-label="Text colour"
              />
              <input
                className={styles.input}
                value={s.textColor}
                placeholder="theme"
                onChange={(e) => setStyle('textColor', e.target.value)}
              />
              {s.textColor && (
                <button type="button" className={styles.smallButton} onClick={() => setStyle('textColor', '')}>
                  Clear
                </button>
              )}
            </span>
          </label>
          {mode === 'advanced' && (
            <label className={styles.field}>
              <span>
                Corner rounding <em>{s.radius}px</em>
              </span>
              <input
                type="range"
                min={0}
                max={48}
                value={s.radius}
                onChange={(e) => setStyle('radius', e.target.valueAsNumber)}
              />
            </label>
          )}
        </div>
      </details>

      <details className={styles.group}>
        <summary>Animation</summary>
        <div className={styles.groupBody}>
          <label className={styles.field}>
            <span>How it arrives</span>
            <select
              className={styles.input}
              value={block.animation.name}
              onChange={(e) => setAnim('name', e.target.value)}
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {a === 'none' ? 'It is simply there' : a.replace('-', ' ')}
                </option>
              ))}
            </select>
          </label>
          {block.animation.name !== 'none' && mode === 'advanced' && (
            <>
              <label className={styles.field}>
                <span>
                  How long <em>{block.animation.duration}ms</em>
                </span>
                <input
                  type="range"
                  min={80}
                  max={900}
                  step={10}
                  value={block.animation.duration}
                  onChange={(e) => setAnim('duration', e.target.valueAsNumber)}
                />
              </label>
              <label className={styles.field}>
                <span>
                  Wait first <em>{block.animation.delay}ms</em>
                </span>
                <input
                  type="range"
                  min={0}
                  max={800}
                  step={20}
                  value={block.animation.delay}
                  onChange={(e) => setAnim('delay', e.target.valueAsNumber)}
                />
              </label>
            </>
          )}
          {block.animation.name !== 'none' && (
            <p className={styles.hint}>
              It plays once, when the block first comes into view. Anyone whose device asks for
              less movement sees no animation at all.
            </p>
          )}
        </div>
      </details>

      <details className={styles.group}>
        <summary>Devices</summary>
        <div className={styles.groupBody}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={s.showOnDesktop}
              onChange={(e) => setStyle('showOnDesktop', e.target.checked)}
            />
            Show on a computer
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={s.showOnTablet}
              onChange={(e) => setStyle('showOnTablet', e.target.checked)}
            />
            Show on a tablet
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={s.showOnMobile}
              onChange={(e) => setStyle('showOnMobile', e.target.checked)}
            />
            Show on a phone
          </label>
          {!s.showOnDesktop && !s.showOnTablet && !s.showOnMobile && (
            <p className={`${styles.hint} t-warn`}>
              Hidden everywhere — nobody will see this block. Delete it instead if you are done
              with it.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
