import type { Metadata } from 'next';

import { FooterEditor } from '@/components/admin/settings/FooterEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Footer' };
export const dynamic = 'force-dynamic';

export default async function FooterPage() {
  await requireStaff();
  const [value, state] = await Promise.all([getDraftSetting('footer'), getSettingState('footer')]);

  return (
    <>
      <PageHeader title="Footer" description="The bottom of every page." />
      <FooterEditor initial={value} hasUnpublishedDraft={state.isDirty} />
    </>
  );
}
