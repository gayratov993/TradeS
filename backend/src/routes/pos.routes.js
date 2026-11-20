const express = require('express');
const router = express.Router();

const posController = require('../controllers/pos.controller');
const { protect } = require('../middlewares/auth.middleware');
const {
  resolveTenant,
  authorizeOrg,
  requireStore,
  requireRegister,
} = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createTransactionSchema,
  openShiftSchema,
  closeShiftSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createReturnSchema,
} = require('../validators/pos.validator');

router.use(protect);

router.get('/customers', resolveTenant, posController.listCustomers);
router.post('/customers', resolveTenant, validate(createCustomerSchema), posController.createCustomer);
router.patch(
  '/customers/:customerId',
  resolveTenant,
  validate(updateCustomerSchema),
  posController.updateCustomer
);

router.get('/shifts/active', resolveTenant, requireStore, requireRegister, posController.getActiveShift);
router.post(
  '/shifts/open',
  resolveTenant,
  requireStore,
  requireRegister,
  validate(openShiftSchema),
  posController.openShift
);
router.post(
  '/shifts/:shiftId/close',
  resolveTenant,
  requireStore,
  requireRegister,
  validate(closeShiftSchema),
  posController.closeShift
);

router.post(
  '/transactions',
  resolveTenant,
  requireStore,
  requireRegister,
  validate(createTransactionSchema),
  posController.createTransaction
);
router.get('/transactions', resolveTenant, posController.listTransactions);
router.get('/transactions/:transactionId/receipt', resolveTenant, posController.getReceipt);

router.post(
  '/returns',
  resolveTenant,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(createReturnSchema),
  posController.createReturn
);

module.exports = router;
