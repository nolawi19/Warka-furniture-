import type { Metadata } from 'next';

import { AppearanceEditor } from '@/components/admin/settings/AppearanceEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Appearance' };
export const dynamic = 'force-dynamic';

export default async function AppearancePage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('theme'), getSettingState('theme')]);

  return (
    <>
      <PageHeader
        title="Appearance"
        description="The colours, corners and spacing of the public website."
      />
      <AppearanceEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
