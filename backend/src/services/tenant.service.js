const { randomBytes } = require('crypto');
const prisma = require('../config/prisma');
const auditService = require('./audit.service');
const ApiError = require('../utils/ApiError');
const { clampLimit } = require('../utils/pagination');

const isGlobalAdmin = (user) => ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'organization';

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

const getOrganizationOrThrow = async (organizationId) => {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, isActive: true },
  });
  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }
  return organization;
};

const assertOrgAccess = async (user, organizationId, roles = []) => {
  if (isGlobalAdmin(user)) return null;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
  });
  if (!membership || !membership.isActive) {
    throw new ApiError(403, 'You are not an active member of this organization');
  }
  if (roles.length && !roles.includes(membership.role)) {
    throw new ApiError(403, `Organization role '${membership.role}' is not authorized`);
  }
  return membership;
};

const uniqueSlug = async (name, preferred) => {
  const base = slugify(preferred || name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(3).toString('hex')}`;
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  throw new ApiError(409, 'Could not generate a unique organization slug');
};

const listOrganizations = async (user, query) => {
  const { page, limit, skip } = buildPage(query);
  const where = isGlobalAdmin(user)
    ? {}
    : { members: { some: { userId: user.id, isActive: true } } };
  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true, name: true, maxStores: true } },
        _count: { select: { stores: true, members: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);
  return paginated(organizations, total, page, limit);
};

const createOrganization = async (user, data) => {
  const plan = await prisma.plan.findUnique({ where: { code: 'BASIC' } });
  if (!plan) {
    throw new ApiError(500, 'Default BASIC plan is missing');
  }

  let ownerId = user.id;
  if (data.ownerUserId) {
    if (!isGlobalAdmin(user)) {
      throw new ApiError(403, 'Only an admin can assign an organization owner');
    }
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerUserId },
      select: { id: true },
    });
    if (!owner) {
      throw new ApiError(404, 'Owner user not found');
    }
    ownerId = owner.id;
  }

  const slug = await uniqueSlug(data.name, data.slug);
  const organization = await prisma.organization.create({
    data: {
      name: data.name,
      slug,
      planId: plan.id,
      address: data.address || '',
      phone: data.phone || '',
      currency: data.currency || 'UZS',
      taxRate: data.taxRate || 0,
      taxEnabled: data.taxEnabled || false,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
    },
    include: { plan: true },
  });
  return organization;
};

const getOrganization = async (user, organizationId) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId);
  return prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      plan: true,
      _count: { select: { stores: true, members: true, customers: true } },
    },
  });
};

const updateOrganization = async (user, organizationId, data) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER']);
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data,
    include: { plan: true },
  });
  return organization;
};

const listStores = async (user, organizationId, query) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId);
  const { page, limit, skip } = buildPage(query);
  const where = { organizationId };
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { registers: true, inventories: true } } },
    }),
    prisma.store.count({ where }),
  ]);
  return paginated(stores, total, page, limit);
};

const createStore = async (user, organizationId, data) => {
  const organization = await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  const plan = await prisma.plan.findUnique({ where: { id: organization.planId } });
  if (!plan) {
    throw new ApiError(500, 'Organization plan is missing');
  }
  const count = await prisma.store.count({ where: { organizationId } });
  if (count >= plan.maxStores) {
    throw new ApiError(409, `Plan '${plan.code}' allows only ${plan.maxStores} store(s)`);
  }
  return prisma.store.create({
    data: {
      organizationId,
      name: data.name,
      code: data.code,
      address: data.address || '',
      phone: data.phone || '',
    },
  });
};

const updateStore = async (user, organizationId, storeId, data) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  const store = await prisma.store.findFirst({ where: { id: storeId, organizationId } });
  if (!store) {
    throw new ApiError(404, 'Store not found');
  }
  return prisma.store.update({ where: { id: storeId }, data });
};

const getStoreOrThrow = async (organizationId, storeId) => {
  const store = await prisma.store.findFirst({ where: { id: storeId, organizationId, isActive: true } });
  if (!store) {
    throw new ApiError(404, 'Store not found');
  }
  return store;
};

const listRegisters = async (user, organizationId, storeId, query) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId);
  await getStoreOrThrow(organizationId, storeId);
  const { page, limit, skip } = buildPage(query);
  const where = { storeId };
  const [registers, total] = await Promise.all([
    prisma.register.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.register.count({ where }),
  ]);
  return paginated(registers, total, page, limit);
};

const createRegister = async (user, organizationId, storeId, data) => {
  const organization = await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  await getStoreOrThrow(organizationId, storeId);
  const plan = await prisma.plan.findUnique({ where: { id: organization.planId } });
  if (!plan) {
    throw new ApiError(500, 'Organization plan is missing');
  }
  const count = await prisma.register.count({ where: { storeId } });
  if (count >= plan.maxRegistersPerStore) {
    throw new ApiError(409, `Plan '${plan.code}' allows only ${plan.maxRegistersPerStore} register(s) per store`);
  }
  return prisma.register.create({
    data: {
      storeId,
      name: data.name,
      code: data.code,
    },
  });
};

const updateRegister = async (user, organizationId, storeId, registerId, data) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  await getStoreOrThrow(organizationId, storeId);
  const register = await prisma.register.findFirst({ where: { id: registerId, storeId } });
  if (!register) {
    throw new ApiError(404, 'Register not found');
  }
  return prisma.register.update({ where: { id: registerId }, data });
};

const findTargetUser = async (data) => {
  const where = data.userId
    ? { id: data.userId }
    : data.email
      ? { email: data.email }
      : { phone: data.phone };
  const target = await prisma.user.findFirst({
    where,
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  if (!target) {
    throw new ApiError(404, 'User not found');
  }
  return target;
};

const getOrganizationPlan = async (organization) => {
  const plan = await prisma.plan.findUnique({ where: { id: organization.planId } });
  if (!plan) {
    throw new ApiError(500, 'Organization plan is missing');
  }
  return plan;
};

const assertMemberCapacity = async (
  organizationId,
  plan,
  { role, checkUsers = false, checkCashier = false } = {}
) => {
  if (!checkUsers && !checkCashier) return;
  const [users, cashiers] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId, isActive: true } }),
    prisma.organizationMember.count({
      where: { organizationId, isActive: true, role: 'CASHIER' },
    }),
  ]);
  if (checkCashier && role === 'CASHIER' && cashiers >= plan.maxCashiers) {
    throw new ApiError(409, `Plan '${plan.code}' allows only ${plan.maxCashiers} cashier(s)`);
  }
  if (checkUsers && users >= plan.maxUsers) {
    throw new ApiError(409, `Plan '${plan.code}' allows only ${plan.maxUsers} user(s)`);
  }
};

const memberInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, role: true } },
};

const listMembers = async (user, organizationId, query) => {
  await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  const { page, limit, skip } = buildPage(query);
  const where = { organizationId };
  const [members, total] = await Promise.all([
    prisma.organizationMember.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: memberInclude,
    }),
    prisma.organizationMember.count({ where }),
  ]);
  return paginated(members, total, page, limit);
};

const addMember = async (user, organizationId, data) => {
  const organization = await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER', 'MANAGER']);
  const target = await findTargetUser(data);
  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: target.id } },
  });
  if (existing && existing.isActive) {
    throw new ApiError(409, 'User is already an active member of this organization');
  }
  const plan = await getOrganizationPlan(organization);
  await assertMemberCapacity(organizationId, plan, {
    role: data.role,
    checkUsers: true,
    checkCashier: data.role === 'CASHIER',
  });
  return prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId: target.id } },
    update: { role: data.role, isActive: true },
    create: { organizationId, userId: target.id, role: data.role },
    include: memberInclude,
  });
};

const updateMember = async (user, organizationId, memberId, data) => {
  const organization = await getOrganizationOrThrow(organizationId);
  await assertOrgAccess(user, organizationId, ['OWNER']);
  const membership = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    include: memberInclude,
  });
  if (!membership) {
    throw new ApiError(404, 'Organization member not found');
  }
  if (membership.role === 'OWNER') {
    throw new ApiError(403, 'Owner membership cannot be changed here');
  }
  const nextRole = data.role || membership.role;
  const nextActive = data.isActive === undefined ? membership.isActive : data.isActive;
  const plan = await getOrganizationPlan(organization);
  await assertMemberCapacity(organizationId, plan, {
    role: nextRole,
    checkUsers: !membership.isActive && nextActive,
    checkCashier: nextRole === 'CASHIER' && membership.role !== 'CASHIER' && nextActive,
  });
  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: nextRole, isActive: nextActive },
    include: memberInclude,
  });
};

const listTenantAuditLogs = async (organizationId, query) => {
  return auditService.getAuditLogs({
    ...query,
    organizationId,
    category: query.category || undefined,
  });
};

const getContext = (req) => ({
  organization: req.tenant.organization,
  store: req.tenant.store,
  register: req.tenant.register,
  role: req.tenant.role,
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
  listTenantAuditLogs,
  getContext,
};
