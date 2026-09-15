import type { Metadata } from 'next';

import { BannerManager } from '@/components/admin/store/BannerManager';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Banners' };
export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  await requireStaff();
  const banners = await db.banner.findMany({ orderBy: [{ placement: 'asc' }, { position: 'asc' }] });

  return (
    <>
      <PageHeader
        title="Banners"
        description="Announcements and promotions, with a start and an end so they switch themselves on and off."
      />
      <BannerManager
        banners={banners.map((b) => ({
          ...b,
          startsAt: b.startsAt?.toISOString() ?? null,
          endsAt: b.endsAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
