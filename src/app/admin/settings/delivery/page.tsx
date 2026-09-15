import type { Metadata } from 'next';

import { DeliveryZones } from '@/components/admin/store/DeliveryZones';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { getPublishedSetting } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Delivery' };
export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  await requireStaff();

  const [zones, store] = await Promise.all([
    db.deliveryZone.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    getPublishedSetting('store'),
  ]);

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Where the shop delivers, what it charges, and how long it takes."
      />
      <DeliveryZones
        currency={store.currency}
        // Santim in the database, Birr in the form. The admin should never be
        // asked to think in hundredths.
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          feeBirr: z.feeSantim / 100,
          freeAboveBirr: z.freeAboveSantim === null ? null : z.freeAboveSantim / 100,
          etaDays: z.etaDays,
          isActive: z.isActive,
        }))}
      />
    </>
  );
}
