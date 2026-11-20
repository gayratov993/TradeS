const posService = require('../services/pos.service');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const tenantContext = (req) => ({
  organizationId: req.tenant.organizationId,
  storeId: req.tenant.storeId,
  registerId: req.tenant.registerId,
});

const listCustomers = asyncHandler(async (req, res) => {
  const result = await posService.listCustomers(req.tenant.organizationId, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Customers retrieved'));
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await posService.createCustomer(req.tenant.organizationId, req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'CUSTOMER_CREATED',
    target: 'Customer',
    targetId: customer.id,
  });
  res.status(201).json(new ApiResponse(201, { customer }, 'Customer created'));
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await posService.updateCustomer(
    req.tenant.organizationId,
    req.params.customerId,
    req.body
  );
  res.status(200).json(new ApiResponse(200, { customer }, 'Customer updated'));
});

const openShift = asyncHandler(async (req, res) => {
  const shift = await posService.openShift(req.user, tenantContext(req), req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'SHIFT_OPENED',
    target: 'RegisterShift',
    targetId: shift.id,
    metadata: { openingCash: shift.openingCash },
  });
  res.status(201).json(new ApiResponse(201, { shift }, 'Shift opened'));
});

const getActiveShift = asyncHandler(async (req, res) => {
  const shift = await posService.getActiveShift(req.user, tenantContext(req));
  res.status(200).json(new ApiResponse(200, { shift }, 'Active shift retrieved'));
});

const closeShift = asyncHandler(async (req, res) => {
  const shift = await posService.closeShift(req.user, tenantContext(req), req.params.shiftId, req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'SHIFT_CLOSED',
    target: 'RegisterShift',
    targetId: shift.id,
    metadata: { closingCash: shift.closingCash },
  });
  res.status(200).json(new ApiResponse(200, { shift }, 'Shift closed'));
});

const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await posService.createTransaction(req.user, tenantContext(req), req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'SALE_TRANSACTION_CREATED',
    target: 'SaleTransaction',
    targetId: transaction.id,
    metadata: {
      saleNumber: transaction.saleNumber,
      receiptNumber: transaction.receiptNumber,
      totalAmount: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      isFromOffline: transaction.isFromOffline,
    },
  });
  res.status(201).json(new ApiResponse(201, { transaction }, 'Transaction completed'));
});

const listTransactions = asyncHandler(async (req, res) => {
  const result = await posService.listTransactions(tenantContext(req), req.query);
  res.status(200).json(new ApiResponse(200, result, 'Transactions retrieved'));
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await posService.getReceipt(req.tenant.organizationId, req.params.transactionId);
  res.status(200).json(new ApiResponse(200, { receipt }, 'Receipt retrieved'));
});

const createReturn = asyncHandler(async (req, res) => {
  const result = await posService.createReturn(req.user, tenantContext(req), req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'SALE_RETURNED',
    target: 'Return',
    targetId: result.id,
    metadata: {
      transactionId: result.transactionId,
      amount: result.amount,
      itemCount: result.items?.length || 0,
    },
  });
  res.status(201).json(new ApiResponse(201, { return: result }, 'Return processed'));
});

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
