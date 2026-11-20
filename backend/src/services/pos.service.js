const { randomBytes } = require('crypto');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { clampLimit } = require('../utils/pagination');

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const generateNumber = (prefix) => `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`;

const buildPage = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = clampLimit(query.limit, 20, 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (items, total, page, limit) => ({
  items,
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
});

const listCustomers = async (organizationId, query) => {
  const { page, limit, skip } = buildPage(query);
  const search = String(query.search || '').trim();
  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  return paginated(customers, total, page, limit);
};

const createCustomer = async (organizationId, data) =>
  prisma.customer.create({
    data: {
      organizationId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || '',
    },
  });

const updateCustomer = async (organizationId, customerId, data) => {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }
  return prisma.customer.update({ where: { id: customerId }, data });
};

const getOpenShift = (ctx, userId) =>
  prisma.registerShift.findFirst({
    where: {
      organizationId: ctx.organizationId,
      storeId: ctx.storeId,
      registerId: ctx.registerId,
      cashierId: userId,
      status: 'OPEN',
    },
    orderBy: { openedAt: 'desc' },
  });

const openShift = async (user, ctx, data) => {
  const existing = await getOpenShift(ctx, user.id);
  if (existing) {
    throw new ApiError(409, 'An open shift already exists for this register');
  }
  return prisma.registerShift.create({
    data: {
      organizationId: ctx.organizationId,
      storeId: ctx.storeId,
      registerId: ctx.registerId,
      cashierId: user.id,
      openingCash: data.openingCash || 0,
      notes: data.notes || '',
    },
  });
};

const getActiveShift = async (user, ctx) => {
  const shift = await getOpenShift(ctx, user.id);
  if (!shift) {
    throw new ApiError(404, 'No open shift found for this register');
  }
  return shift;
};

const closeShift = async (user, ctx, shiftId, data) => {
  const shift = await prisma.registerShift.findFirst({
    where: {
      id: shiftId,
      organizationId: ctx.organizationId,
      storeId: ctx.storeId,
      registerId: ctx.registerId,
      cashierId: user.id,
      status: 'OPEN',
    },
  });
  if (!shift) {
    throw new ApiError(404, 'Open shift not found');
  }
  const closedAt = new Date();
  const payments = await prisma.payment.findMany({
    where: {
      method: 'CASH',
      transaction: {
        organizationId: ctx.organizationId,
        storeId: ctx.storeId,
        registerId: ctx.registerId,
        cashierId: user.id,
        createdAt: { gte: shift.openedAt, lte: closedAt },
      },
    },
    select: { amount: true },
  });
  const cashSales = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return prisma.registerShift.update({
    where: { id: shift.id },
    data: {
      status: 'CLOSED',
      closingCash: data.closingCash,
      expectedCash: round2(shift.openingCash + cashSales),
      closedAt,
      notes: data.notes || shift.notes,
    },
  });
};

const getTransactionOrThrow = async (organizationId, transactionId) => {
  const transaction = await prisma.saleTransaction.findFirst({
    where: { id: transactionId, organizationId },
  });
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }
  return transaction;
};

const createTransaction = async (user, ctx, data) => {
  if (data.syncId) {
    const existing = await prisma.saleTransaction.findUnique({ where: { syncId: data.syncId } });
    if (existing) {
      if (existing.organizationId !== ctx.organizationId || existing.cashierId !== user.id) {
        throw new ApiError(409, 'Sync ID already used by another transaction', [], '', 'SYNC_ID_CONFLICT');
      }
      return existing;
    }
  }

  const organization = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { taxEnabled: true, taxRate: true },
  });
  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  const shift = await getOpenShift(ctx, user.id);
  if (!shift) {
    throw new ApiError(409, 'Open a register shift before creating a transaction');
  }

  const items = data.items || [];
  if (!items.length) {
    throw new ApiError(422, 'At least one item is required');
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: {
      id: true,
      name: true,
      unit: true,
      buyPrice: true,
      sellPrice: true,
      finalPrice: true,
      price: true,
    },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  if (products.length !== productIds.length) {
    throw new ApiError(404, 'One or more products are not available');
  }

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!customer) {
      throw new ApiError(404, 'Customer not found');
    }
  }

  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId);
    const quantity = Number(item.quantity);
    const price = round2(product.sellPrice || product.finalPrice || product.price || 0);
    const gross = round2(quantity * price);
    const discount = round2(Math.min(Number(item.discount || 0), gross));
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit || 'dona',
      sellPrice: price,
      buyPrice: round2(product.buyPrice || 0),
      lineDiscount: discount,
      totalRevenue: round2(gross - discount),
      totalCost: round2(quantity * (product.buyPrice || 0)),
      gross,
    };
  });

  const subtotal = round2(lineItems.reduce((sum, item) => sum + item.gross, 0));
  const lineDiscount = round2(lineItems.reduce((sum, item) => sum + item.lineDiscount, 0));
  const orderDiscount = round2(Math.min(Number(data.discountAmount || 0), subtotal - lineDiscount));
  const taxable = round2(subtotal - lineDiscount - orderDiscount);
  const taxAmount = organization.taxEnabled ? round2((taxable * organization.taxRate) / 100) : 0;
  const totalAmount = round2(taxable + taxAmount);

  const payments = (data.payments || []).map((payment) => ({
    method: payment.method,
    amount: round2(payment.amount),
    reference: payment.reference || '',
  }));
  if (!payments.length) {
    throw new ApiError(422, 'At least one payment is required');
  }
  if (payments.some((payment) => payment.amount <= 0)) {
    throw new ApiError(422, 'Payment amounts must be positive');
  }
  const paidAmount = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const isOffline = data.isFromOffline === true;
  if (paidAmount < totalAmount && !isOffline) {
    throw new ApiError(400, 'Payment amount is less than the transaction total');
  }

  const saleNumber = generateNumber('S');
  const receiptNumber = generateNumber('R');

  try {
    return await prisma.$transaction(async (tx) => {
      for (const item of lineItems) {
        const inventory = await tx.storeInventory.updateMany({
          where: {
            storeId: ctx.storeId,
            productId: item.productId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (inventory.count === 0) {
          throw new ApiError(400, 'Insufficient stock', [], '', 'INSUFFICIENT_STOCK');
        }
        const global = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (global.count === 0) {
          throw new ApiError(400, 'Insufficient stock', [], '', 'INSUFFICIENT_STOCK');
        }
      }

      return tx.saleTransaction.create({
        data: {
          organizationId: ctx.organizationId,
          storeId: ctx.storeId,
          registerId: ctx.registerId,
          cashierId: user.id,
          customerId: data.customerId || null,
          saleNumber,
          receiptNumber,
          subtotal,
          discountAmount: round2(lineDiscount + orderDiscount),
          taxAmount,
          totalAmount,
          paidAmount,
          changeAmount: round2(paidAmount - totalAmount),
          paymentMethod: payments.length > 1 ? 'MIXED' : payments[0].method,
          paymentStatus: paidAmount >= totalAmount ? 'PAID' : 'PARTIAL',
          status: 'COMPLETED',
          note: data.note || '',
          syncId: data.syncId || null,
          isFromOffline: isOffline,
          items: {
            create: lineItems.map((item) => ({
              userId: user.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              sellPrice: item.sellPrice,
              buyPrice: item.buyPrice,
              totalRevenue: item.totalRevenue,
              totalCost: item.totalCost,
              profit: round2(item.totalRevenue - item.totalCost),
              lineDiscount: item.lineDiscount,
              taxAmount: 0,
            })),
          },
          payments: {
            create: payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });
    });
  } catch (err) {
    if (err?.code === 'P2002' && data.syncId) {
      const existing = await prisma.saleTransaction.findUnique({ where: { syncId: data.syncId } });
      if (existing) return existing;
    }
    throw err;
  }
};

const listTransactions = async (ctx, query) => {
  const { page, limit, skip } = buildPage(query);
  const where = { organizationId: ctx.organizationId };
  if (ctx.storeId) where.storeId = ctx.storeId;
  if (ctx.registerId) where.registerId = ctx.registerId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  const [transactions, total] = await Promise.all([
    prisma.saleTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        _count: { select: { items: true, payments: true, returns: true } },
      },
    }),
    prisma.saleTransaction.count({ where }),
  ]);
  return paginated(transactions, total, page, limit);
};

const getReceipt = async (organizationId, transactionId) => {
  const transaction = await prisma.saleTransaction.findFirst({
    where: { id: transactionId, organizationId },
    include: {
      organization: { select: { name: true, currency: true, taxRate: true, taxEnabled: true, address: true, phone: true } },
      store: { select: { name: true, code: true, address: true, phone: true } },
      register: { select: { name: true, code: true } },
      cashier: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      items: true,
      payments: true,
      returns: { include: { items: true } },
    },
  });
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }
  return transaction;
};

const createReturn = async (user, ctx, data) => {
  const transaction = await getTransactionOrThrow(ctx.organizationId, data.transactionId);
  const requestItems = data.items || [];
  if (!requestItems.length) {
    throw new ApiError(422, 'At least one return item is required');
  }

  const sales = await prisma.sale.findMany({
    where: { transactionId: transaction.id, id: { in: requestItems.map((item) => item.saleId) } },
  });
  if (sales.length !== requestItems.length) {
    throw new ApiError(404, 'One or more sale items were not found in this transaction');
  }

  const priorReturns = await prisma.returnItem.findMany({
    where: { return: { transactionId: transaction.id } },
    select: { saleId: true, quantity: true },
  });
  const returnedBySale = new Map();
  priorReturns.forEach((item) => {
    returnedBySale.set(item.saleId, (returnedBySale.get(item.saleId) || 0) + item.quantity);
  });

  const returnItems = requestItems.map((request) => {
    const sale = sales.find((item) => item.id === request.saleId);
    const alreadyReturned = returnedBySale.get(sale.id) || 0;
    const available = sale.quantity - alreadyReturned;
    const quantity = Number(request.quantity);
    if (quantity <= 0 || quantity > available) {
      throw new ApiError(400, `Invalid return quantity for ${sale.productName}`);
    }
    const unitPrice = sale.quantity > 0 ? sale.totalRevenue / sale.quantity : sale.sellPrice;
    return {
      saleId: sale.id,
      productId: sale.productId,
      quantity,
      amount: round2(unitPrice * quantity),
      reason: request.reason || data.reason || '',
    };
  });

  const amount = round2(returnItems.reduce((sum, item) => sum + item.amount, 0));

  return prisma.$transaction(async (tx) => {
    for (const item of returnItems) {
      if (item.productId) {
        await tx.storeInventory.updateMany({
          where: { storeId: transaction.storeId, productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    const result = await tx.return.create({
      data: {
        organizationId: ctx.organizationId,
        transactionId: transaction.id,
        processedById: user.id,
        reason: data.reason || '',
        amount,
        status: 'COMPLETED',
        items: {
          create: returnItems.map((item) => ({
            saleId: item.saleId,
            quantity: item.quantity,
            amount: item.amount,
            reason: item.reason,
          })),
        },
      },
      include: { items: true },
    });
    await tx.saleTransaction.update({
      where: { id: transaction.id },
      data: { paymentStatus: 'REFUNDED', status: 'RETURNED' },
    });
    return result;
  });
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  openShift,
  getActiveShift,
  closeShift,
  createTransaction,
  listTransactions,
  getReceipt,
  createReturn,
};
