import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';

import { db } from '@/lib/db';
import type { BannerPlacement } from '@prisma/client';

export const BANNERS_TAG = 'site-banners';

export function revalidateBanners(): void {
  revalidateTag(BANNERS_TAG);
}

export type LiveBanner = {
  id: string;
  headline: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  bgColor: string | null;
  textColor: string | null;
  isDismissible: boolean;
};

/**
 * The banners a visitor should see right now.
 *
 * "Right now" is decided here rather than in the query's cache key, so a
 * banner that starts at noon appears at noon without anyone publishing
 * anything: the rows are cached, the date comparison is not.
 */
const activeBanners = unstable_cache(
  async (placement: BannerPlacement) => {
    return db.banner.findMany({
      where: { placement, isActive: true },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        headline: true,
        body: true,
        imageUrl: true,
        linkUrl: true,
        linkLabel: true,
        bgColor: true,
        textColor: true,
        isDismissible: true,
        startsAt: true,
        endsAt: true,
      },
    });
  },
  ['site-banners'],
  { tags: [BANNERS_TAG], revalidate: 60 },
);

export async function getBanners(placement: BannerPlacement): Promise<LiveBanner[]> {
  const rows = await activeBanners(placement);
  const now = Date.now();
  return rows
    .filter((b) => (!b.startsAt || b.startsAt.getTime() <= now) && (!b.endsAt || b.endsAt.getTime() >= now))
    .map(({ startsAt: _s, endsAt: _e, ...rest }) => rest);
}
