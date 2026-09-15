import type { Metadata } from 'next';

import { SeoEditor } from '@/components/admin/settings/SeoEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'SEO' };
export const dynamic = 'force-dynamic';

export default async function SeoPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('seo'), getSettingState('seo')]);
  const host = (process.env.APP_URL ?? 'http://localhost:3000').replace(/^https?:\/\//, '');

  return (
    <>
      <PageHeader title="SEO" description="What people see when they find the shop in a search." />
      <SeoEditor initial={value} hasUnpublishedDraft={state.isDirty} siteHost={host} />
    </>
  );
}
