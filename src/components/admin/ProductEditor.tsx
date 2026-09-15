'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { saveProductAction, saveVariantAction } from '@/app/actions/admin';
import styles from './ProductEditor.module.css';

type Category = { id: string; name: string };
type Variant = {
  id: string;
  label: string;
  sku: string;
  priceSantim: number | null;
  salePriceSantim: number | null;
  stock: number;
  trackStock: boolean;
};

const toBirr = (santim: number | null) => (santim === null ? '' : String(santim / 100));

export function ProductEditor({
  product,
  categories,
  variants,
}: {
  product: {
    id: string | null;
    name: string;
    slug: string;
    categoryId: string;
    description: string;
    materials: string;
    status: string;
    isFeatured: boolean;
    shortDescription: string;
    brand: string;
    tags: string;
    seoTitle: string;
    seoDescription: string;
  };
  categories: Category[];
  variants: Variant[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const router = useRouter();

  function save(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProductAction(product.id, formData);
      if (result.ok) {
        setMessage({ tone: 'ok', text: 'Saved. It is live on the shop now.' });
        if (!product.id && result.id) router.push(`/admin/products/${result.id}`);
        else router.refresh();
      } else {
        setMessage({ tone: 'error', text: result.message ?? 'That did not save.' });
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <form action={save} className={styles.form}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Name</span>
            <input name="name" defaultValue={product.name} required maxLength={120} />
          </label>
          <label className={styles.field}>
            <span>
              Web address <em>leave blank to build it from the name</em>
            </span>
            <input name="slug" defaultValue={product.slug} maxLength={120} placeholder="buttoned-bed" />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Category</span>
            <select name="categoryId" defaultValue={product.categoryId} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Status</span>
            <select name="status" defaultValue={product.status}>
              <option value="DRAFT">Draft — not on the shop</option>
              <option value="PUBLISHED">Published — customers can buy it</option>
              <option value="ARCHIVED">Archived — hidden, history kept</option>
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span>Description</span>
          <textarea name="description" defaultValue={product.description} rows={4} maxLength={4000} />
        </label>

        <label className={styles.field}>
          <span>Materials</span>
          <textarea name="materials" defaultValue={product.materials} rows={2} maxLength={2000} />

        <label className={styles.field}>
          <span>Short description</span>
          <input
            name="shortDescription"
            defaultValue={product.shortDescription}
            maxLength={300}
            placeholder="One line for cards and search results"
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Brand</span>
            <input name="brand" defaultValue={product.brand} maxLength={80} placeholder="Warka" />
          </label>
          <label className={styles.field}>
            <span>Tags</span>
            <input
              name="tags"
              defaultValue={product.tags}
              maxLength={400}
              placeholder="bedroom, buttoned, made to measure"
            />
            <small>Separated by commas. They are searchable on the shop.</small>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Search title</span>
            <input
              name="seoTitle"
              defaultValue={product.seoTitle}
              maxLength={160}
              placeholder="Leave blank to use the product name"
            />
          </label>
          <label className={styles.field}>
            <span>Search description</span>
            <input
              name="seoDescription"
              defaultValue={product.seoDescription}
              maxLength={320}
              placeholder="Leave blank to use the short description"
            />
          </label>
        </div>
        </label>

        <label className={styles.check}>
          <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} />
          <span>Show on the homepage</span>
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={pending}>
            {pending ? 'Saving…' : product.id ? 'Save changes' : 'Create product'}
          </button>
          <p className={styles.message} role="status" data-tone={message?.tone}>
            {message?.text ?? ''}
          </p>
        </div>
      </form>

      {product.id && (
        <section className={styles.variants} aria-labelledby="variants-heading">
          <h2 id="variants-heading" className={styles.variantsTitle}>
            Variants
          </h2>
          <p className={styles.variantsHint}>
            These are what customers actually add to a basket. Leave the price empty for anything
            quoted in the shop.
          </p>

          <ul className={styles.variantList}>
            {variants.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VariantRow({ variant }: { variant: Variant }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<'ok' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save(formData: FormData) {
    setSaved(null);
    setError(null);
    startTransition(async () => {
      const result = await saveVariantAction(variant.id, formData);
      if (result.ok) {
        setSaved('ok');
        router.refresh();
        setTimeout(() => setSaved(null), 2500);
      } else {
        setSaved('error');
        setError(result.message ?? 'Did not save.');
      }
    });
  }

  return (
    <li className={styles.variantRow}>
      <form action={save}>
        <div className={styles.variantGrid}>
          <label className={styles.small}>
            <span>Label</span>
            <input name="label" defaultValue={variant.label} required maxLength={120} />
          </label>
          <label className={styles.small}>
            <span>Code</span>
            <input name="sku" defaultValue={variant.sku} required maxLength={40} />
          </label>
          <label className={styles.small}>
            <span>Price (Br)</span>
            <input name="price" defaultValue={toBirr(variant.priceSantim)} inputMode="decimal" placeholder="quoted" />
          </label>
          <label className={styles.small}>
            <span>Sale (Br)</span>
            <input name="salePrice" defaultValue={toBirr(variant.salePriceSantim)} inputMode="decimal" placeholder="—" />
          </label>
          <label className={styles.small}>
            <span>Stock</span>
            <input name="stock" type="number" min={0} defaultValue={variant.stock} />
          </label>
          <label className={styles.smallCheck}>
            <input type="checkbox" name="trackStock" defaultChecked={variant.trackStock} />
            <span>Track</span>
          </label>
          <button type="submit" className={styles.variantSave} disabled={pending} data-saved={saved}>
            {pending ? '…' : saved === 'ok' ? 'Saved' : 'Save'}
          </button>
        </div>
        {error && <p className={styles.variantError}>{error}</p>}
      </form>
    </li>
  );
}
