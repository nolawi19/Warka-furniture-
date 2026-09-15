import type { Metadata } from 'next';

import { HeaderEditor } from '@/components/admin/settings/HeaderEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Header' };
export const dynamic = 'force-dynamic';

export default async function HeaderPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('header'), getSettingState('header')]);

  return (
    <>
      <PageHeader title="Header" description="The bar across the top of every page." />
      <HeaderEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
