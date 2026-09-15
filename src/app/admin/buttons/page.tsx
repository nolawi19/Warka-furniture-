import type { Metadata } from 'next';

import { ButtonsEditor } from '@/components/admin/settings/ButtonsEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Buttons' };
export const dynamic = 'force-dynamic';

export default async function ButtonsPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('buttons'), getSettingState('buttons')]);

  return (
    <>
      <PageHeader title="Buttons" description="How every button on the public website looks." />
      <ButtonsEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
