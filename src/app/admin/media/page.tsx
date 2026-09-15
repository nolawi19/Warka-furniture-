import type { Metadata } from 'next';

import { MediaLibrary } from '@/components/admin/media/MediaLibrary';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Media library' };
export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  await requireStaff();

  const items = await db.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      url: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      width: true,
      height: true,
      alt: true,
      title: true,
    },
  });

  const missingAlt = items.filter((i) => !i.alt).length;

  return (
    <>
      <PageHeader
        title="Media library"
        description={
          missingAlt > 0
            ? `${items.length} image${items.length === 1 ? '' : 's'}. ${missingAlt} still need a description for screen readers.`
            : `${items.length} image${items.length === 1 ? '' : 's'}.`
        }
      />
      <MediaLibrary items={items} />
    </>
  );
}
