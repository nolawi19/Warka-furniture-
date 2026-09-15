import type { Metadata } from 'next';

import { NavigationEditor } from '@/components/admin/settings/NavigationEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Navigation' };
export const dynamic = 'force-dynamic';

export default async function NavigationPage() {
  await requireStaff();
  const [value, state, categories, pages] = await Promise.all([
    getDraftSetting('nav.header'),
    getSettingState('nav.header'),
    db.category.findMany({ where: { isPublished: true }, select: { name: true, slug: true }, orderBy: { position: 'asc' } }),
    db.page.findMany({ where: { status: 'PUBLISHED' }, select: { title: true, slug: true } }),
  ]);

  // Only destinations that exist. Suggesting a link to a page nobody has made
  // is how a menu ends up pointing at a 404.
  const suggestions = [
    { label: 'Shop', href: '/shop' },
    { label: 'Collections', href: '/collections' },
    { label: 'Our craft', href: '/craft' },
    { label: 'Visit', href: '/visit' },
    { label: 'Contact', href: '/contact' },
    ...categories.map((c) => ({ label: c.name, href: `/shop?category=${c.slug}` })),
    ...pages.map((p) => ({ label: p.title, href: `/${p.slug}` })),
  ];

  return (
    <>
      <PageHeader title="Navigation" description="The links across the top of the website." />
      <NavigationEditor initial={value} hasUnpublishedDraft={state.isDirty} suggestions={suggestions} />
    </>
  );
}
