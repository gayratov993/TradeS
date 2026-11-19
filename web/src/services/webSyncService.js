/**
 * Web POS — offline sync service.
 *
 * pullAndCacheProducts  — fetches products from /sync/pull and stores in IndexedDB
 * syncPendingSales      — pushes queued offline sales to /sync/push
 * fullSync              — pull then push
 */

import * as syncApi from '../api/sync.api';
import {
  mergeProducts,
  getPendingSales,
  removePendingSale,
  getLastSyncAt,
  setLastSyncAt,
} from './offlineDB';

export const pullAndCacheProducts = async () => {
  try {
    const lastSyncAt = await getLastSyncAt();
    const res = await syncApi.syncPull(lastSyncAt);
    const { products = [], deletedProductIds = [], serverTime } = res.data?.data || {};

    // Incremental pull: merge changed products and apply tombstones for deletes.
    // Clearing here would wipe products the server didn't include in this batch.
    await mergeProducts(products, deletedProductIds);

    if (serverTime) {
      await setLastSyncAt(serverTime);
    }

    return { pulled: products.length, deleted: deletedProductIds.length };
  } catch (err) {
    console.error('[webSync] pullAndCacheProducts failed:', err);
    return { pulled: 0 };
  }
};

export const syncPendingSales = async () => {
  const pending = await getPendingSales();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const operations = pending.map((s) => ({
    operation: 'create',
    entity: 'sale',
    entityId: s.localId || String(s.id),
    payload: {
      product: s.product,
      productName: s.productName,
      quantity: s.quantity,
      sellPrice: s.sellPrice,
      buyPrice: s.buyPrice,
      unit: s.unit || 'pcs',
      note: s.note || '',
      createdAt: s.createdAt,
    },
    clientUpdatedAt: s.createdAt,
  }));

  let synced = 0;
  let failed = 0;

  try {
    const res = await syncApi.syncPush(operations);
    const results = res.data?.data?.results || [];

    const byEntityId = new Map(results.map((r) => [String(r.entityId), r]));

    for (const sale of pending) {
      const entityId = sale.localId || String(sale.id);
      const result = byEntityId.get(entityId);
      if (result?.status === 'synced') {
        await removePendingSale(sale.id);
        synced++;
      } else {
        failed++;
      }
    }
  } catch (err) {
    console.error('[webSync] syncPendingSales failed:', err);
    failed += pending.length;
  }

  return { synced, failed };
};

export const fullSync = async () => {
  await pullAndCacheProducts();
  return syncPendingSales();
};
