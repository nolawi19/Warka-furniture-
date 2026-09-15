import type { Metadata } from 'next';

import { TaxEditor } from '@/components/admin/settings/TaxEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Tax' };
export const dynamic = 'force-dynamic';

export default async function TaxPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('tax'), getSettingState('tax')]);

  return (
    <>
      <PageHeader title="Tax" description="Whether tax is shown to customers, and how." />
      <TaxEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
