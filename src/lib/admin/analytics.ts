import 'server-only';

import { db } from '@/lib/db';

/**
 * The numbers behind the overview and the analytics screen.
 *
 * One rule runs through all of it: only orders that were actually paid for
 * count as money. A basket that was abandoned at the gateway is not revenue,
 * and counting it would flatter the shop into bad decisions.
 */
const COUNTED = ['PAID', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

export type DayPoint = { date: string; label: string; revenue: number; orders: number };
export type Ranked = { id: string; label: string; sub: string; value: number; count: number };

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function salesSeries(days: number): Promise<DayPoint[]> {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));

  const orders = await db.order.findMany({
    where: { status: { in: [...COUNTED] }, placedAt: { gte: from } },
    select: { placedAt: true, totalSantim: true },
  });

  // Every day in the window appears, including the empty ones — a chart that
  // silently drops quiet days makes a business look busier than it is.
  const buckets = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      revenue: 0,
      orders: 0,
    });
  }

  for (const o of orders) {
    const key = o.placedAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += o.totalSantim;
    bucket.orders += 1;
  }

  return [...buckets.values()];
}

export async function topProducts(limit = 8): Promise<Ranked[]> {
  const rows = await db.orderItem.groupBy({
    by: ['productName', 'sku'],
    where: { order: { status: { in: [...COUNTED] } } },
    _sum: { lineTotalSantim: true, qty: true },
    orderBy: { _sum: { lineTotalSantim: 'desc' } },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.sku,
    label: r.productName,
    sub: r.sku,
    value: r._sum.lineTotalSantim ?? 0,
    count: r._sum.qty ?? 0,
  }));
}

export async function topCategories(limit = 8): Promise<Ranked[]> {
  // OrderItem stores the name it was sold under, not a category, because a
  // product can move category later and an order's history must not move with
  // it. So the join goes through the variant that is still on the item.
  const items = await db.orderItem.findMany({
    where: { order: { status: { in: [...COUNTED] } } },
    select: {
      lineTotalSantim: true,
      qty: true,
      variant: { select: { product: { select: { category: { select: { id: true, name: true } } } } } },
    },
  });

  const totals = new Map<string, Ranked>();
  for (const item of items) {
    const category = item.variant?.product.category;
    if (!category) continue;
    const row = totals.get(category.id) ?? {
      id: category.id,
      label: category.name,
      sub: '',
      value: 0,
      count: 0,
    };
    row.value += item.lineTotalSantim;
    row.count += item.qty;
    totals.set(category.id, row);
  }

  return [...totals.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((r) => ({ ...r, sub: `${r.count} sold` }));
}

export type Headline = {
  revenueAllTime: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  ordersTotal: number;
  ordersPending: number;
  ordersProcessing: number;
  ordersCompleted: number;
  ordersCancelled: number;
  customers: number;
  products: number;
  lowStock: number;
  outOfStock: number;
};

export async function headlineNumbers(): Promise<Headline> {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfDay(new Date(now.getTime() - 6 * 86_400_000));
  const month = startOfDay(new Date(now.getTime() - 29 * 86_400_000));

  const paid = { status: { in: [...COUNTED] } };

  const [
    allTime,
    todayAgg,
    weekAgg,
    monthAgg,
    ordersTotal,
    ordersPending,
    ordersProcessing,
    ordersCompleted,
    ordersCancelled,
    customers,
    products,
    variants,
  ] = await Promise.all([
    db.order.aggregate({ where: paid, _sum: { totalSantim: true } }),
    db.order.aggregate({ where: { ...paid, placedAt: { gte: today } }, _sum: { totalSantim: true } }),
    db.order.aggregate({ where: { ...paid, placedAt: { gte: week } }, _sum: { totalSantim: true } }),
    db.order.aggregate({ where: { ...paid, placedAt: { gte: month } }, _sum: { totalSantim: true } }),
    db.order.count(),
    db.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    db.order.count({ where: { status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY'] } } }),
    db.order.count({ where: { status: 'DELIVERED' } }),
    db.order.count({ where: { status: { in: ['CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'] } } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count({ where: { status: 'PUBLISHED' } }),
    db.productVariant.findMany({
      where: { trackStock: true, allowBackorder: false },
      select: { stock: true, lowStockThreshold: true },
    }),
  ]);

  return {
    revenueAllTime: allTime._sum.totalSantim ?? 0,
    revenueToday: todayAgg._sum.totalSantim ?? 0,
    revenueWeek: weekAgg._sum.totalSantim ?? 0,
    revenueMonth: monthAgg._sum.totalSantim ?? 0,
    ordersTotal,
    ordersPending,
    ordersProcessing,
    ordersCompleted,
    ordersCancelled,
    customers,
    products,
    // Compared against each variant's own threshold, not one number for the
    // whole shop: a bench and a bolt of fabric do not run low at the same count.
    lowStock: variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length,
    outOfStock: variants.filter((v) => v.stock <= 0).length,
  };
}
