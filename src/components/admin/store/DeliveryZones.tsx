'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteDeliveryZoneAction,
  reorderDeliveryZonesAction,
  saveDeliveryZoneAction,
} from '@/app/actions/admin-delivery';
import { Card } from '@/components/admin/ui/Card';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import styles from './Store.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

export type Zone = {
  id: string;
  name: string;
  feeBirr: number;
  freeAboveBirr: number | null;
  etaDays: string | null;
  centreLat: number | null;
  centreLng: number | null;
  radiusKm: number | null;
  isActive: boolean;
};

type Draft = Omit<Zone, 'id'> & { id?: string };

const BLANK: Draft = {
  name: '',
  feeBirr: 0,
  freeAboveBirr: null,
  etaDays: '',
  isActive: true,
  centreLat: null,
  centreLng: null,
  radiusKm: null,
};

export function DeliveryZones({ zones: initial, currency }: { zones: Zone[]; currency: string }) {
  const [zones, setZones] = useServerData(initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(draft: Draft) {
    startTransition(async () => {
      const result = await saveDeliveryZoneAction(draft);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(zone: Zone) {
    if (!window.confirm(`Remove the “${zone.name}” delivery zone?`)) return;
    startTransition(async () => {
      const result = await deleteDeliveryZoneAction(zone.id);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function reorder(next: Zone[]) {
    setZones(next);
    startTransition(async () => {
      const result = await reorderDeliveryZonesAction(next.map((z) => z.id));
      if (!result?.ok) router.refresh();
    });
  }

  return (
    <div className={styles.wrap}>
      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {zones.length === 0 ? (
        <EmptyState title="No delivery zones" body="Customers cannot choose a delivery area until there is at least one.">
          <button type="button" className={styles.primary} onClick={() => setEditing({ ...BLANK })}>
            Add the first zone
          </button>
        </EmptyState>
      ) : (
        <Card
          title="Zones"
          description="Shown at checkout in this order. The fee is added to the order total on the server."
          actions={
            <button type="button" className={styles.primary} onClick={() => setEditing({ ...BLANK })}>
              + Add zone
            </button>
          }
        >
          <SortableList items={zones} label="Delivery zones" getKey={(z) => z.id} onReorder={reorder}>
            {(zone, args) => (
              <div className={styles.row} data-off={!zone.isActive}>
                <DragHandle args={args} />
                <div className={styles.rowMain}>
                  <button type="button" className={styles.rowName} onClick={() => setEditing(zone)}>
                    {zone.name}
                  </button>
                  <span className={styles.rowMeta}>
                    {zone.feeBirr === 0 ? 'Free' : `${zone.feeBirr.toLocaleString()} ${currency}`}
                    {zone.freeAboveBirr !== null &&
                      ` · free over ${zone.freeAboveBirr.toLocaleString()} ${currency}`}
                    {zone.etaDays && ` · ${zone.etaDays}`}
                    {!zone.isActive && ' · not offered'}
                  </span>
                </div>
                <button type="button" className={styles.linkButton} onClick={() => setEditing(zone)}>
                  Edit
                </button>
                <button type="button" className={styles.dangerButton} onClick={() => remove(zone)} disabled={pending}>
                  Remove
                </button>
              </div>
            )}
          </SortableList>
        </Card>
      )}

      {editing && (
        <div className={styles.backdrop} onMouseDown={() => setEditing(null)} role="presentation">
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? `Edit ${editing.name}` : 'New delivery zone'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className={styles.dialogTitle}>{editing.id ? `Edit ${editing.name}` : 'New delivery zone'}</h2>
            <div className={styles.dialogGrid}>
              <label className={styles.field}>
                <span>Name</span>
                <input
                  className="admin-input"
                  value={editing.name}
                  autoFocus
                  placeholder="Inside Addis Ababa"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Delivery fee ({currency})</span>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step="1"
                  value={editing.feeBirr}
                  onChange={(e) =>
                    setEditing({ ...editing, feeBirr: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0 })
                  }
                />
                <small>0 means delivery to this zone is free.</small>
              </label>
              <label className={styles.field}>
                <span>Free above ({currency})</span>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step="1"
                  value={editing.freeAboveBirr ?? ''}
                  placeholder="never"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      freeAboveBirr: e.target.value === '' ? null : e.target.valueAsNumber,
                    })
                  }
                />
                <small>Leave blank and the fee always applies.</small>
              </label>
              <label className={styles.field}>
                <span>How long it takes</span>
                <input
                  className="admin-input"
                  value={editing.etaDays ?? ''}
                  placeholder="2 to 3 days"
                  onChange={(e) => setEditing({ ...editing, etaDays: e.target.value })}
                />
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Offer this zone at checkout
              </label>

              {/* Where the zone is, so the checkout map can recognise a pin
                  that falls in it. All three are optional: a zone with no
                  centre is still chosen from the list by hand, exactly as
                  every zone was before the map existed. */}
              <label className={styles.field}>
                <span>Centre — latitude</span>
                <input
                  className="admin-input"
                  type="number"
                  step="0.00001"
                  min={-90}
                  max={90}
                  value={editing.centreLat ?? ''}
                  placeholder="9.01080"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      centreLat: e.target.value === '' ? null : e.target.valueAsNumber,
                    })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Centre — longitude</span>
                <input
                  className="admin-input"
                  type="number"
                  step="0.00001"
                  min={-180}
                  max={180}
                  value={editing.centreLng ?? ''}
                  placeholder="38.76130"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      centreLng: e.target.value === '' ? null : e.target.valueAsNumber,
                    })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Radius (km)</span>
                <input
                  className="admin-input"
                  type="number"
                  step="0.5"
                  min={0}
                  max={2000}
                  value={editing.radiusKm ?? ''}
                  placeholder="12"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      radiusKm: e.target.value === '' ? null : e.target.valueAsNumber,
                    })
                  }
                />
                <small>
                  Fill all three and a pin dropped inside this circle picks this zone at checkout,
                  with this fee. Leave them blank and the zone works exactly as it does now.
                </small>
              </label>
            </div>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.linkButton} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={pending || !editing.name.trim()}
                onClick={() => save(editing)}
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
