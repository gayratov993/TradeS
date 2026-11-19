const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { clampLimit } = require('../utils/pagination');
const { assertTestUserWithinLimits } = require('../utils/testUserLimits');

const findSaleBySyncId = (syncId) => prisma.sale.findUnique({ where: { syncId } });

const assertSyncIdOwner = (sale, userId) => {
  if (sale.userId !== userId) {
    throw new ApiError(409, 'Sync ID already used by another user', [], '', 'SYNC_ID_CONFLICT');
  }
};

const createSale = async (userId, saleData, options = {}) => {
  const { product: productId, quantity, note, syncId, unit } = saleData;
  const allowOffline = options.allowOffline === true;
  const isOffline = allowOffline && saleData.isFromOffline === true;

  // Idempotency: a retry with the same client-generated syncId returns the
  // original sale instead of double-deducting stock or throwing P2002.
  if (syncId) {
    const existing = await findSaleBySyncId(syncId);
    if (existing) return assertSyncIdOwner(existing, userId), existing;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isTestUser: true, testExpiresAt: true, testActionCount: true },
  });
  assertTestUserWithinLimits(user);

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, 'Invalid quantity', [], '', 'INVALID_QUANTITY');
  }

  // Products are a shared global catalog: any authenticated user can sell any
  // active product, regardless of who originally created it.
  const product = productId
    ? await prisma.product.findFirst({
        where: { id: productId, isActive: true },
        select: {
          id: true, name: true, stock: true, unit: true,
          buyPrice: true, sellPrice: true, finalPrice: true, price: true,
        },
      })
    : null;
  if (productId && !product) throw new ApiError(404, `Product ${productId} not found`);

  // Price and name are server-owned. A client must not be able to submit a
  // discounted sellPrice and keep the profit, or rename a product per sale.
  const sellPrice = product
    ? Number(product.sellPrice) || Number(product.finalPrice) || Number(product.price) || 0
    : Number(saleData.sellPrice) || 0;
  const buyPrice = product
    ? Number(product.buyPrice) || 0
    : Number(saleData.buyPrice) || 0;
  const productName = product?.name || String(saleData.productName || '').trim();
  if (!productName) throw new ApiError(400, 'productName is required', [], '', 'INVALID_PRODUCT_NAME');

  try {
    return await prisma.$transaction(async (tx) => {
      if (product) {
        if (isOffline) {
          // The physical sale already happened before reconnection; allow stock
          // to go negative rather than dropping the sale.
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: qty } },
          });
        } else {
          // Atomic compare-and-decrement: two concurrent checkouts cannot both
          // pass a stock check and then oversell the same units.
          const updated = await tx.product.updateMany({
            where: { id: product.id, isActive: true, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (updated.count === 0) {
            throw new ApiError(400, 'Insufficient stock', [], '', 'INSUFFICIENT_STOCK');
          }
        }
      }

      const sale = await tx.sale.create({
        data: {
          userId,
          productId: product?.id || null,
          productName,
          quantity: qty,
          sellPrice,
          buyPrice,
          totalRevenue: qty * sellPrice,
          totalCost: qty * buyPrice,
          profit: qty * sellPrice - qty * buyPrice,
          unit: product?.unit || unit || 'pcs',
          note,
          syncId: syncId || undefined,
          isFromOffline: isOffline,
          createdAt: isOffline && saleData.createdAt ? new Date(saleData.createdAt) : undefined,
        },
      });

      if (user.isTestUser) {
        await tx.user.update({ where: { id: userId }, data: { testActionCount: { increment: 1 } } });
      }

      return sale;
    });
  } catch (err) {
    if (err?.code === 'P2002' && syncId) {
      const existing = await findSaleBySyncId(syncId);
      if (existing) return assertSyncIdOwner(existing, userId), existing;
    }
    throw err;
  }
};

const bulkSync = async (userId, sales) => {
  const results = [];
  for (const s of sales) {
    try {
      const sale = await createSale(userId, s, { allowOffline: true });
      results.push({ syncId: s.syncId, serverId: sale.id, status: 'synced' });
    } catch (err) {
      results.push({ syncId: s.syncId, status: 'failed', error: err.message });
    }
  }
  return results;
};

const getSales = async (userId, { page = 1, limit = 100, from, to, date } = {}) => {
  const where = { userId };

  if (date) {
    // Single day filter
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const take = clampLimit(limit, 100);
  const skip = (Number(page) - 1) * take;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.sale.count({ where }),
  ]);

  return { sales, total, page: Number(page), pages: Math.ceil(total / take) };
};

module.exports = { createSale, bulkSync, getSales };
