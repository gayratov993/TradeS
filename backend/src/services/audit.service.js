const prisma = require('../config/prisma');
const { clampLimit } = require('../utils/pagination');

const getAuditLogs = async ({
  page = 1,
  limit = 30,
  category,
  from,
  to,
  search,
  organizationId,
  storeId,
} = {}) => {
  const take = clampLimit(limit, 30);
  const skip = (Number(page) - 1) * take;
  const where = {};

  if (organizationId) where.organizationId = organizationId;
  if (storeId) where.storeId = storeId;
  if (category) where.category = category;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { actor: { contains: search, mode: 'insensitive' } },
      { target: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page: Number(page), pages: Math.ceil(total / take) };
};

const getAuditLogsExport = async ({ category, from, to, organizationId, storeId } = {}) => {
  const where = {};
  if (organizationId) where.organizationId = organizationId;
  if (storeId) where.storeId = storeId;
  if (category) where.category = category;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const header = 'ID,Action,Category,Actor,OrganizationId,StoreId,Target,IP,CreatedAt\n';
  const rows = logs.map((l) =>
    `${l.id},${l.action},${l.category},${l.actor},${l.organizationId || ''},${l.storeId || ''},${l.target},${l.ip},${l.createdAt.toISOString()}`
  ).join('\n');
  return header + rows;
};

const createAuditLog = async ({
  action,
  category,
  actor,
  actorId,
  organizationId,
  storeId,
  target,
  targetId,
  ip,
  metadata,
} = {}) => {
  return prisma.auditLog.create({
    data: {
      action,
      category,
      actor,
      actorId,
      organizationId,
      storeId,
      target,
      targetId,
      ip,
      metadata,
    },
  });
};

const createTenantAuditLog = async (
  req,
  { action, category = 'pos', target, targetId, metadata = {} } = {}
) => {
  return createAuditLog({
    action,
    category,
    actor: req.user?.name || 'system',
    actorId: req.user?.id || null,
    organizationId: req.tenant?.organizationId || null,
    storeId: req.tenant?.storeId || null,
    target,
    targetId,
    ip: req.ip,
    metadata: {
      ...metadata,
      registerId: req.tenant?.registerId || null,
    },
  });
};

module.exports = {
  getAuditLogs,
  getAuditLogsExport,
  createAuditLog,
  createTenantAuditLog,
};
