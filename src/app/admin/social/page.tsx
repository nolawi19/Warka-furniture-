import type { Metadata } from 'next';

import { SocialEditor } from '@/components/admin/settings/SocialEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Social links' };
export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('social'), getSettingState('social')]);

  return (
    <>
      <PageHeader title="Social links" description="The shop's accounts, shown in the footer." />
      <SocialEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
