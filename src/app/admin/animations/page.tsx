import type { Metadata } from 'next';

import { AnimationsEditor } from '@/components/admin/settings/AnimationsEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Animations' };
export const dynamic = 'force-dynamic';

export default async function AnimationsPage() {
  await requireStaff();
  const [value, state] = await Promise.all([
    getDraftSetting('animations'),
    getSettingState('animations'),
  ]);

  return (
    <>
      <PageHeader title="Animations" description="How much the public website moves." />
      <AnimationsEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
