const express = require('express');
const router = express.Router();

const tenantController = require('../controllers/tenant.controller');
const { protect } = require('../middlewares/auth.middleware');
const {
  resolveTenant,
  authorizeOrg,
  requireStore,
} = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createOrganizationSchema,
  updateOrganizationSchema,
  createStoreSchema,
  updateStoreSchema,
  createRegisterSchema,
  updateRegisterSchema,
  addMemberSchema,
  updateMemberSchema,
} = require('../validators/tenant.validator');

router.use(protect);

router.get('/organizations', tenantController.listOrganizations);
router.post('/organizations', validate(createOrganizationSchema), tenantController.createOrganization);

router.get('/organizations/:organizationId', resolveTenant, tenantController.getOrganization);
router.patch(
  '/organizations/:organizationId',
  resolveTenant,
  authorizeOrg('OWNER'),
  validate(updateOrganizationSchema),
  tenantController.updateOrganization
);

router.get('/organizations/:organizationId/stores', resolveTenant, tenantController.listStores);
router.post(
  '/organizations/:organizationId/stores',
  resolveTenant,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(createStoreSchema),
  tenantController.createStore
);

router.patch(
  '/stores/:storeId',
  resolveTenant,
  requireStore,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(updateStoreSchema),
  tenantController.updateStore
);

router.get(
  '/stores/:storeId/registers',
  resolveTenant,
  requireStore,
  tenantController.listRegisters
);
router.post(
  '/stores/:storeId/registers',
  resolveTenant,
  requireStore,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(createRegisterSchema),
  tenantController.createRegister
);
router.patch(
  '/registers/:registerId',
  resolveTenant,
  requireStore,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(updateRegisterSchema),
  tenantController.updateRegister
);

router.get(
  '/organizations/:organizationId/members',
  resolveTenant,
  tenantController.listMembers
);
router.post(
  '/organizations/:organizationId/members',
  resolveTenant,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(addMemberSchema),
  tenantController.addMember
);
router.patch(
  '/members/:memberId',
  resolveTenant,
  authorizeOrg('OWNER'),
  validate(updateMemberSchema),
  tenantController.updateMember
);

router.get(
  '/organizations/:organizationId/audit-logs',
  resolveTenant,
  authorizeOrg('OWNER', 'MANAGER'),
  tenantController.listAuditLogs
);

router.get('/context', resolveTenant, tenantController.getContext);

module.exports = router;
