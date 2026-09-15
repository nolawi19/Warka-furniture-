import { NextResponse } from 'next/server';

import { assertStaff } from '@/lib/admin-guard';
import { ADMIN_LINKS } from '@/lib/admin/nav';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export type SearchHit = {
  kind: 'page' | 'product' | 'order' | 'customer' | 'category' | 'media' | 'section';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/**
 * One search box for the whole admin.
 *
 * Guarded server-side like every other admin surface: a customer who finds
 * this URL gets 404, not a list of every order reference in the shop.
 */
export async function GET(request: Request) {
  const staff = await assertStaff();
  if (!staff) return NextResponse.json({ hits: [] }, { status: 404 });

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const like = { contains: q, mode: 'insensitive' as const };

  const [products, orders, customers, categories, pages, media] = await Promise.all([
    db.product.findMany({
      where: { OR: [{ name: like }, { slug: like }, { searchText: like }] },
      select: { id: true, name: true, slug: true, status: true },
      take: 5,
    }),
    db.order.findMany({
      where: { OR: [{ reference: like }, { email: like }, { name: like }, { phone: like }] },
      select: { id: true, reference: true, name: true, status: true },
      orderBy: { placedAt: 'desc' },
      take: 5,
    }),
    db.user.findMany({
      where: { OR: [{ name: like }, { email: like }, { phone: like }] },
      select: { id: true, name: true, email: true },
      take: 5,
    }),
    db.category.findMany({
      where: { OR: [{ name: like }, { slug: like }] },
      select: { id: true, name: true, slug: true },
      take: 5,
    }),
    db.page.findMany({
      where: { OR: [{ title: like }, { slug: like }] },
      select: { id: true, title: true, slug: true, status: true },
      take: 5,
    }),
    db.mediaAsset.findMany({
      where: { OR: [{ filename: like }, { alt: like }, { title: like }] },
      select: { id: true, filename: true, url: true },
      take: 5,
    }),
  ]);

  const needle = q.toLowerCase();
  const sections = ADMIN_LINKS.filter(
    (l) => l.label.toLowerCase().includes(needle) || l.hint.toLowerCase().includes(needle),
  ).slice(0, 4);

  const hits: SearchHit[] = [
    ...sections.map((l) => ({
      kind: 'section' as const,
      id: l.href,
      title: l.label,
      subtitle: l.hint,
      href: l.href,
    })),
    ...products.map((p) => ({
      kind: 'product' as const,
      id: p.id,
      title: p.name,
      subtitle: p.status.toLowerCase(),
      href: `/admin/products/${p.id}`,
    })),
    ...orders.map((o) => ({
      kind: 'order' as const,
      id: o.id,
      title: o.reference,
      subtitle: `${o.name} · ${o.status.toLowerCase().replace(/_/g, ' ')}`,
      href: `/admin/orders/${o.reference}`,
    })),
    ...customers.map((c) => ({
      kind: 'customer' as const,
      id: c.id,
      title: c.name,
      subtitle: c.email,
      href: `/admin/customers/${c.id}`,
    })),
    ...categories.map((c) => ({
      kind: 'category' as const,
      id: c.id,
      title: c.name,
      subtitle: `/${c.slug}`,
      href: `/admin/categories`,
    })),
    ...pages.map((p) => ({
      kind: 'page' as const,
      id: p.id,
      title: p.title,
      subtitle: `/${p.slug} · ${p.status.toLowerCase()}`,
      href: `/admin/builder/${p.id}`,
    })),
    ...media.map((m) => ({
      kind: 'media' as const,
      id: m.id,
      title: m.filename,
      subtitle: m.url,
      href: `/admin/media`,
    })),
  ];

  return NextResponse.json({ hits });
}
