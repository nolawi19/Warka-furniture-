import type { Metadata } from 'next';

import { InventoryTable } from '@/components/admin/catalogue/InventoryTable';
import { Card } from '@/components/admin/ui/Card';
import { Table, cell } from '@/components/admin/ui/Table';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Inventory' };
export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  SEED: 'Set up',
  ADMIN_ADJUSTMENT: 'Adjusted by hand',
  ORDER_RESERVED: 'Reserved for an order',
  ORDER_RELEASED: 'Released back',
  ORDER_FULFILLED: 'Sent out',
  RETURN: 'Returned',
};

export default async function AdminInventory() {
  await requireStaff();

  const [tracked, movements, untrackedCount] = await Promise.all([
    db.productVariant.findMany({
      where: { trackStock: true },
      orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
      select: {
        id: true,
        sku: true,
        label: true,
        stock: true,
        lowStockThreshold: true,
        allowBackorder: true,
        product: { select: { id: true, name: true } },
      },
    }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        delta: true,
        reason: true,
        note: true,
        actorLabel: true,
        createdAt: true,
        variant: { select: { label: true, sku: true, product: { select: { name: true } } } },
        order: { select: { reference: true } },
      },
    }),
    db.productVariant.count({ where: { trackStock: false } }),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${tracked.length} variants track stock. ${untrackedCount} are made to order and hold none — that is not a shortage.`}
      />

      <InventoryTable
        rows={tracked.map((v) => ({
          id: v.id,
          sku: v.sku,
          label: v.label,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          allowBackorder: v.allowBackorder,
          productId: v.product.id,
          productName: v.product.name,
        }))}
      />

      <div style={{ marginTop: 'var(--space-5)' }}>
        <Card
          title="History"
          description="Every change to a stock count, and why. Nothing here is written by hand — each row was produced by the thing that happened."
          padded={false}
        >
          {movements.length === 0 ? (
            <p style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
              No stock has moved yet.
            </p>
          ) : (
            <Table
              head={
                <>
                  <th>What</th>
                  <th className={cell.num}>Change</th>
                  <th>Why</th>
                  <th>Who</th>
                  <th>When</th>
                </>
              }
            >
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.variant.product.name}
                    <span className={cell.faint} style={{ display: 'block' }}>
                      {m.variant.label} · {m.variant.sku}
                    </span>
                  </td>
                  <td className={cell.num} style={{ color: m.delta < 0 ? 'var(--danger)' : 'var(--ok)' }}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className={cell.dim}>
                    {REASON_LABEL[m.reason] ?? m.reason}
                    {m.note && <span className={cell.faint} style={{ display: 'block' }}>{m.note}</span>}
                    {m.order && <span className={cell.faint} style={{ display: 'block' }}>{m.order.reference}</span>}
                  </td>
                  <td className={cell.dim}>{m.actorLabel ?? '—'}</td>
                  <td className={cell.dim}>
                    {m.createdAt.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
