import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { loginAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/forms/AuthForm';
import { currentUser } from '@/lib/auth';
import styles from '../register/page.module.css';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
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
        <h1 className={`dsp ${styles.title}`}>Sign in</h1>
        <p className={styles.blurb}>
          To see your orders, track a delivery, and check out faster next time.
        </p>
        <AuthForm mode="login" action={loginAction} next={target} />
      </div>
    </div>
  );
}
