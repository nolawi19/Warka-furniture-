import type { Metadata } from 'next';

import { PaymentsEditor } from '@/components/admin/settings/PaymentsEditor';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { availableProviders } from '@/lib/payments/engine';
import { methodStates } from '@/lib/site/payment-methods';
import { getDraftSetting, getSettingState } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Payments' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  await requireStaff();
  const [value, state, methods] = await Promise.all([
    getDraftSetting('payments'),
    getSettingState('payments'),
    methodStates(),
  ]);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Which ways of paying to offer at checkout."
      />
      <PaymentsEditor
        initial={value}
        hasUnpublishedDraft={state.isDirty}
        providerReady={availableProviders().length > 0}
        // Only the label, the hint and whether credentials exist. No key, no
        // fragment of a key, and nothing that could be turned back into one.
        methods={methods.map((m) => ({
          id: m.id,
          label: m.label,
          hint: m.hint,
          kind: m.kind,
          providerId: m.providerId,
          configured: m.configured,
        }))}
      />
    </>
  );
}
