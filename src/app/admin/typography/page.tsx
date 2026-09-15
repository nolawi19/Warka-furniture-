import type { Metadata } from 'next';

import { TypographyEditor } from '@/components/admin/settings/TypographyEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Typography' };
export const dynamic = 'force-dynamic';

export default async function TypographyPage() {
  await requireStaff();
  const [value, state] = await Promise.all([
    getDraftSetting('typography'),
    getSettingState('typography'),
  ]);

  return (
    <>
      <PageHeader title="Typography" description="Fonts, sizes and spacing for the public website." />
      <TypographyEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
