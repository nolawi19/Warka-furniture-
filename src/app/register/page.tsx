import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { registerAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/forms/AuthForm';
import { currentUser } from '@/lib/auth';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (user) redirect(target);

  return (
    <div className="wrap">
      <div className={styles.panel}>
        <h1 className={`dsp ${styles.title}`}>Create an account</h1>
        <p className={styles.blurb}>
          So you can follow your order from the workshop to your floor. You can also order
          without one.
        </p>
        <AuthForm mode="register" action={registerAction} next={target} />
      </div>
    </div>
  );
}
