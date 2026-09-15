'use client';

import { useMemo, useState } from 'react';

import styles from './BankPicker.module.css';

export type BankOption = {
  id: string;
  name: string;
  shortName: string | null;
  kind: 'BANK' | 'WALLET' | 'MICROFINANCE';
  isSupported: boolean;
};

/**
 * Which bank or wallet the customer is paying from.
 *
 * It is a searchable list because there are forty of them and a dropdown of
 * forty is unusable on a phone. What it does NOT do is move money: the payment
 * still happens on the gateway's own page, and this is recorded on the order so
 * the shop knows what to expect and can chase the right thing if it goes quiet.
 */
export function BankPicker({ banks }: { banks: BankOption[] }) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState('');
  const [open, setOpen] = useState(false);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((b) => `${b.name} ${b.shortName ?? ''}`.toLowerCase().includes(term));
  }, [banks, query]);

  const selected = banks.find((b) => b.id === chosen);

  if (banks.length === 0) return null;

  return (
    <div className={styles.picker}>
      <p className={styles.label}>
        Which bank or wallet will you pay from?
        <span className={styles.optional}>optional</span>
      </p>

      {selected ? (
        <div className={styles.chosen}>
          <span>
            <strong>{selected.name}</strong>
            {!selected.isSupported && (
              <span className={styles.warn}>
                — we will confirm this one with you before taking payment
              </span>
            )}
          </span>
          <button
            type="button"
            className={styles.change}
            onClick={() => {
              setChosen('');
              setOpen(true);
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            className={styles.search}
            placeholder="Search — CBE, Awash, Telebirr…"
            aria-label="Search banks and wallets"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />

          {open && (
            <ul className={styles.list}>
              {shown.length === 0 ? (
                <li className={styles.empty}>Nothing matches “{query.trim()}”.</li>
              ) : (
                shown.slice(0, 60).map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={styles.option}
                      onClick={() => {
                        setChosen(b.id);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <span className={styles.optionName}>{b.name}</span>
                      <span className={styles.optionKind}>
                        {b.kind === 'WALLET' ? 'wallet' : b.kind === 'MICROFINANCE' ? 'microfinance' : 'bank'}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      <input type="hidden" name="bank" value={chosen} />
    </div>
  );
}
