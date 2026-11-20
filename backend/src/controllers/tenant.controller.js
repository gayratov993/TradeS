const tenantService = require('../services/tenant.service');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const listOrganizations = asyncHandler(async (req, res) => {
  const result = await tenantService.listOrganizations(req.user, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Organizations retrieved'));
});

const createOrganization = asyncHandler(async (req, res) => {
  const organization = await tenantService.createOrganization(req.user, req.body);
  res.status(201).json(new ApiResponse(201, { organization }, 'Organization created'));
});

const getOrganization = asyncHandler(async (req, res) => {
  const organization = await tenantService.getOrganization(req.user, req.tenant.organizationId);
  res.status(200).json(new ApiResponse(200, { organization }, 'Organization retrieved'));
});

const updateOrganization = asyncHandler(async (req, res) => {
  const organization = await tenantService.updateOrganization(
    req.user,
    req.tenant.organizationId,
    req.body
  );
  res.status(200).json(new ApiResponse(200, { organization }, 'Organization updated'));
});

const listStores = asyncHandler(async (req, res) => {
  const result = await tenantService.listStores(req.user, req.tenant.organizationId, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Stores retrieved'));
});

const createStore = asyncHandler(async (req, res) => {
  const store = await tenantService.createStore(req.user, req.tenant.organizationId, req.body);
  res.status(201).json(new ApiResponse(201, { store }, 'Store created'));
});

const updateStore = asyncHandler(async (req, res) => {
  const store = await tenantService.updateStore(
    req.user,
    req.tenant.organizationId,
    req.tenant.storeId,
    req.body
  );
  res.status(200).json(new ApiResponse(200, { store }, 'Store updated'));
});

const listRegisters = asyncHandler(async (req, res) => {
  const result = await tenantService.listRegisters(
    req.user,
    req.tenant.organizationId,
    req.tenant.storeId,
    req.query
  );
  res.status(200).json(new ApiResponse(200, result, 'Registers retrieved'));
});

const createRegister = asyncHandler(async (req, res) => {
  const register = await tenantService.createRegister(
    req.user,
    req.tenant.organizationId,
    req.tenant.storeId,
    req.body
  );
  res.status(201).json(new ApiResponse(201, { register }, 'Register created'));
});

const updateRegister = asyncHandler(async (req, res) => {
  const register = await tenantService.updateRegister(
    req.user,
    req.tenant.organizationId,
    req.tenant.storeId,
    req.params.registerId,
    req.body
  );
  res.status(200).json(new ApiResponse(200, { register }, 'Register updated'));
});

const listMembers = asyncHandler(async (req, res) => {
  const result = await tenantService.listMembers(req.user, req.tenant.organizationId, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Organization members retrieved'));
});

const addMember = asyncHandler(async (req, res) => {
  const member = await tenantService.addMember(req.user, req.tenant.organizationId, req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'MEMBER_ADDED',
    category: 'tenant',
    target: 'OrganizationMember',
    targetId: member.id,
    metadata: { userId: member.userId, role: member.role },
  });
  res.status(201).json(new ApiResponse(201, { member }, 'Organization member added'));
});

const updateMember = asyncHandler(async (req, res) => {
  const member = await tenantService.updateMember(
    req.user,
    req.tenant.organizationId,
    req.params.memberId,
    req.body
  );
  await auditService.createTenantAuditLog(req, {
    action: 'MEMBER_UPDATED',
    category: 'tenant',
    target: 'OrganizationMember',
    targetId: member.id,
    metadata: { userId: member.userId, role: member.role, isActive: member.isActive },
  });
  res.status(200).json(new ApiResponse(200, { member }, 'Organization member updated'));
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await tenantService.listTenantAuditLogs(req.tenant.organizationId, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Audit logs retrieved'));
});

const getContext = asyncHandler(async (req, res) => {
  const context = tenantService.getContext(req);
  res.status(200).json(new ApiResponse(200, context, 'Tenant context retrieved'));
});

module.exports = {
  listOrganizations,
  createOrganization,
  getOrganization,
  updateOrganization,
  listStores,
  createStore,
  updateStore,
  listRegisters,
  createRegister,
  updateRegister,
  listMembers,
  addMember,
  updateMember,
  listAuditLogs,
  getContext,
};
