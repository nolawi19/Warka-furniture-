'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setCustomerActiveAction } from '@/app/actions/admin-customers';
import styles from './Store.module.css';

export function CustomerControls({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const question = isActive
      ? `Disable ${name}'s account? They will be signed out and cannot sign in again until you restore it. Their orders are kept.`
      : `Restore ${name}'s account?`;
    if (!window.confirm(question)) return;

    startTransition(async () => {
      const result = await setCustomerActiveAction(id, !isActive);
      setMessage(result?.message ?? '');
      if (result?.ok) router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      {message && <span className="t-xs t-muted">{message}</span>}
      <button
        type="button"
        className={isActive ? styles.dangerButton : styles.primary}
        onClick={toggle}
        disabled={pending}
      >
        {pending ? 'Working…' : isActive ? 'Disable account' : 'Restore account'}
      </button>
    </div>
  );
}
