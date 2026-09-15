import type { Metadata } from 'next';

import { StoreEditor } from '@/components/admin/settings/StoreEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Store settings' };
export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('store'), getSettingState('store')]);

  return (
    <>
      <PageHeader title="Store settings" description="The shop's name, contact details and currency." />
      <StoreEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
