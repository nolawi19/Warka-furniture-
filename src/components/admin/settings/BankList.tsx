'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { saveBankAction, setBankActiveAction, syncBanksAction } from '@/app/actions/admin-banks';
import { Card } from '@/components/admin/ui/Card';
import styles from '../store/Store.module.css';

export type BankRow = {
  id: string;
  name: string;
  shortName: string | null;
  kind: 'BANK' | 'WALLET' | 'MICROFINANCE';
  isActive: boolean;
  isSupported: boolean;
  chapaId: string | null;
};

const KIND_LABEL: Record<BankRow['kind'], string> = {
  BANK: 'Bank',
  WALLET: 'Wallet',
  MICROFINANCE: 'Microfinance',
};

export function BankList({ banks: initial, gatewayReady }: { banks: BankRow[]; gatewayReady: boolean }) {
  const [banks, setBanks] = useState(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'supported' | 'shown'>('all');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', shortName: '', kind: 'BANK' as BankRow['kind'] });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return banks.filter((b) => {
      if (filter === 'supported' && !b.isSupported) return false;
      if (filter === 'shown' && !b.isActive) return false;
      if (!term) return true;
      return `${b.name} ${b.shortName ?? ''}`.toLowerCase().includes(term);
    });
  }, [banks, query, filter]);

  function toggle(bank: BankRow, isActive: boolean) {
    setBanks((prev) => prev.map((b) => (b.id === bank.id ? { ...b, isActive } : b)));
    startTransition(async () => {
      const result = await setBankActiveAction(bank.id, isActive);
      if (!result?.ok) {
        setMessage({ tone: 'error', text: result?.message ?? 'Could not save.' });
        router.refresh();
      }
    });
  }

  function sync() {
    startTransition(async () => {
      const result = await syncBanksAction();
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function add() {
    startTransition(async () => {
      const result = await saveBankAction(draft);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setAdding(false);
        setDraft({ name: '', shortName: '', kind: 'BANK' });
        router.refresh();
      }
    });
  }

  const supported = banks.filter((b) => b.isSupported).length;

  return (
    <Card
      title="Banks and wallets"
      description={
        supported > 0
          ? `${supported} of ${banks.length} confirmed by the gateway. A customer picks one at checkout.`
          : `${banks.length} in the list. None confirmed by a gateway yet — press Check with Chapa once your keys are in.`
      }
      actions={
        <button type="button" className={styles.primary} onClick={sync} disabled={pending || !gatewayReady}>
          {pending ? 'Checking…' : 'Check with Chapa'}
        </button>
      }
    >
      {!gatewayReady && (
        <p className={styles.message} data-tone="error" style={{ marginBottom: 'var(--space-3)' }}>
          CHAPA_SECRET_KEY is not set on this server, so the gateway cannot be asked which of these
          it settles. The list below is still yours to edit, and customers can still tell you which
          bank they intend to use.
        </p>
      )}

      {message && (
        <p className={styles.message} data-tone={message.tone} role="status" style={{ marginBottom: 'var(--space-3)' }}>
          {message.text}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          type="search"
          className="admin-input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Search banks and wallets"
          aria-label="Search banks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="admin-input"
          style={{ width: 'auto' }}
          aria-label="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">Everything</option>
          <option value="supported">Gateway confirmed</option>
          <option value="shown">Shown at checkout</option>
        </select>
        <button type="button" className={styles.linkButton} onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancel' : '+ Add one'}
        </button>
      </div>

      {adding && (
        <div className={styles.rowCard} style={{ marginBottom: 'var(--space-3)', gap: 'var(--space-2)' }}>
          <input
            className="admin-input"
            placeholder="Name"
            value={draft.name}
            autoFocus
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            className="admin-input"
            placeholder="Short name (optional)"
            value={draft.shortName}
            onChange={(e) => setDraft({ ...draft, shortName: e.target.value })}
          />
          <select
            className="admin-input"
            style={{ width: 'auto' }}
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as BankRow['kind'] })}
          >
            <option value="BANK">Bank</option>
            <option value="WALLET">Wallet</option>
            <option value="MICROFINANCE">Microfinance</option>
          </select>
          <button type="button" className={styles.primary} onClick={add} disabled={pending || draft.name.trim().length < 2}>
            Add
          </button>
        </div>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)', marginBottom: 8 }}>
        Showing {shown.length} of {banks.length}.
      </p>

      <div style={{ display: 'grid', gap: 4, maxHeight: 520, overflowY: 'auto' }}>
        {shown.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', padding: 'var(--space-4)' }}>
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          shown.map((b) => (
            <div key={b.id} className={styles.row} data-off={!b.isActive}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <input type="checkbox" checked={b.isActive} onChange={(e) => toggle(b, e.target.checked)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
                    {b.name}
                    {b.shortName && <span style={{ color: 'var(--ink-3)' }}> · {b.shortName}</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>
                    {KIND_LABEL[b.kind]}
                    {b.chapaId && ` · gateway id ${b.chapaId}`}
                  </span>
                </span>
              </label>
              <span className={styles.badge} data-tone={b.isSupported ? 'ok' : undefined}>
                {b.isSupported ? 'gateway confirmed' : 'not confirmed'}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
