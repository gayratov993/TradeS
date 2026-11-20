const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const getActivePlans = async () => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  });
  return { plans };
};

const getOrganizationOrThrow = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { plan: true },
  });
  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }
  return organization;
};

const getUsage = async (organizationId) => {
  const [stores, registers, users, cashiers] = await Promise.all([
    prisma.store.count({ where: { organizationId, isActive: true } }),
    prisma.register.count({ where: { store: { organizationId }, isActive: true } }),
    prisma.organizationMember.count({ where: { organizationId, isActive: true } }),
    prisma.organizationMember.count({
      where: { organizationId, isActive: true, role: 'CASHIER' },
    }),
  ]);
  return { stores, registers, users, cashiers };
};

const getCurrentSubscription = async (organizationId) => {
  const organization = await getOrganizationOrThrow(organizationId);
  const usage = await getUsage(organizationId);
  return {
    subscription: {
      planCode: organization.plan.code,
      planName: organization.plan.name,
      monthlyPrice: organization.plan.monthlyPrice,
      limits: {
        maxStores: organization.plan.maxStores,
        maxRegistersPerStore: organization.plan.maxRegistersPerStore,
        maxUsers: organization.plan.maxUsers,
        maxCashiers: organization.plan.maxCashiers,
      },
      status: organization.subscriptionStatus,
      trialEndsAt: organization.trialEndsAt,
      currentPeriodEndsAt: organization.currentPeriodEndsAt,
    },
    usage,
  };
};

const changePlan = async (organizationId, { planCode, periodDays }) => {
  const organization = await getOrganizationOrThrow(organizationId);
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) {
    throw new ApiError(404, 'Plan not found');
  }

  const usage = await getUsage(organizationId);
  const exceeded = [];
  if (usage.stores > plan.maxStores) exceeded.push(`stores ${usage.stores}/${plan.maxStores}`);
  if (usage.users > plan.maxUsers) exceeded.push(`users ${usage.users}/${plan.maxUsers}`);
  if (usage.cashiers > plan.maxCashiers) {
    exceeded.push(`cashiers ${usage.cashiers}/${plan.maxCashiers}`);
  }

  const registersByStore = await prisma.store.findMany({
    where: { organizationId, isActive: true },
    select: {
      name: true,
      _count: { select: { registers: { where: { isActive: true } } } },
    },
  });
  for (const store of registersByStore) {
    if (store._count.registers > plan.maxRegistersPerStore) {
      exceeded.push(`${store.name} registers ${store._count.registers}/${plan.maxRegistersPerStore}`);
    }
  }

  if (exceeded.length) {
    throw new ApiError(409, `Plan limits exceeded: ${exceeded.join(', ')}`);
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planId: plan.id,
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEndsAt: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
    },
  });

  return getCurrentSubscription(organizationId);
};

const cancelSubscription = async (organizationId) => {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { subscriptionStatus: 'CANCELLED', currentPeriodEndsAt: null },
  });
  return getCurrentSubscription(organizationId);
};

module.exports = { getActivePlans, getCurrentSubscription, changePlan, cancelSubscription };
