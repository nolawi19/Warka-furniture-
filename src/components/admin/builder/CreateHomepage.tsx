'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { createHomepageAction } from '@/app/actions/admin-pages-home';
import styles from '../../../app/admin/builder/builder.module.css';

export function CreateHomepage() {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        className={styles.primary}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createHomepageAction();
            setMessage(result?.message ?? '');
            if (result?.ok && result.id) router.push(`/admin/builder/${result.id}`);
          })
        }
      >
        {pending ? 'Creating…' : 'Build the homepage'}
      </button>
      {message && <p className={styles.meta} style={{ marginTop: 8 }}>{message}</p>}
    </div>
  );
}
