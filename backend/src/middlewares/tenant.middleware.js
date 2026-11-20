const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const isGlobalAdmin = (user) => ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

const resolveTenant = asyncHandler(async (req, res, next) => {
  let organizationId =
    req.params.organizationId ||
    req.headers['x-organization-id'] ||
    req.body?.organizationId ||
    req.query.organizationId;
  let storeId = req.params.storeId || req.headers['x-store-id'] || req.body?.storeId || req.query.storeId;
  let registerId =
    req.params.registerId || req.headers['x-register-id'] || req.body?.registerId || req.query.registerId;

  let register = null;
  if (registerId) {
    register = await prisma.register.findUnique({
      where: { id: registerId },
      include: { store: true },
    });
    if (!register || !register.isActive || !register.store.isActive) {
      throw new ApiError(404, 'Register not found');
    }
    if (storeId && storeId !== register.storeId) {
      throw new ApiError(400, 'Register does not belong to the selected store');
    }
    if (organizationId && organizationId !== register.store.organizationId) {
      throw new ApiError(400, 'Register does not belong to the selected organization');
    }
    storeId = register.storeId;
    organizationId = register.store.organizationId;
  }

  let store = register?.store || null;
  if (storeId && store?.id !== storeId) {
    store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.isActive) {
      throw new ApiError(404, 'Store not found');
    }
    if (organizationId && organizationId !== store.organizationId) {
      throw new ApiError(400, 'Store does not belong to the selected organization');
    }
    organizationId = store.organizationId;
  }

  if (!organizationId) {
    throw new ApiError(400, 'Organization context is required');
  }

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization || !organization.isActive) {
    throw new ApiError(404, 'Organization not found');
  }

  let membership = null;
  if (!isGlobalAdmin(req.user)) {
    membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: req.user.id } },
    });
    if (!membership || !membership.isActive) {
      throw new ApiError(403, 'You are not an active member of this organization');
    }
  }

  req.tenant = {
    organization,
    organizationId,
    membership,
    role: membership?.role || req.user.role,
    store,
    storeId: store?.id || null,
    register,
    registerId: register?.id || null,
  };
  next();
});

const authorizeOrg = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (isGlobalAdmin(req.user)) {
      return next();
    }
    if (!req.tenant?.membership) {
      return next(new ApiError(403, 'Organization membership is required'));
    }
    if (!roles.includes(req.tenant.membership.role)) {
      return next(
        new ApiError(403, `Organization role '${req.tenant.membership.role}' is not authorized`)
      );
    }
    next();
  };
};

const requireStore = (req, res, next) => {
  if (!req.tenant?.storeId) {
    return next(new ApiError(400, 'Store context is required'));
  }
  next();
};

const requireRegister = (req, res, next) => {
  if (!req.tenant?.registerId) {
    return next(new ApiError(400, 'Register context is required'));
  }
  next();
};

module.exports = { resolveTenant, authorizeOrg, requireStore, requireRegister };
