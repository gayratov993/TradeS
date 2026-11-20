const subscriptionService = require('../services/subscription.service');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const listPlans = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getActivePlans();
  res.status(200).json(new ApiResponse(200, data, 'Plans retrieved'));
});

const getCurrent = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getCurrentSubscription(req.tenant.organizationId);
  res.status(200).json(new ApiResponse(200, data, 'Subscription retrieved'));
});

const changePlan = asyncHandler(async (req, res) => {
  const data = await subscriptionService.changePlan(req.tenant.organizationId, req.body);
  await auditService.createTenantAuditLog(req, {
    action: 'SUBSCRIPTION_PLAN_CHANGED',
    category: 'subscription',
    target: 'Organization',
    targetId: req.tenant.organizationId,
    metadata: {
      planCode: data.subscription.planCode,
      status: data.subscription.status,
    },
  });
  res.status(200).json(new ApiResponse(200, data, 'Subscription plan changed'));
});

const cancel = asyncHandler(async (req, res) => {
  const data = await subscriptionService.cancelSubscription(req.tenant.organizationId);
  await auditService.createTenantAuditLog(req, {
    action: 'SUBSCRIPTION_CANCELLED',
    category: 'subscription',
    target: 'Organization',
    targetId: req.tenant.organizationId,
  });
  res.status(200).json(new ApiResponse(200, data, 'Subscription cancelled'));
});

module.exports = { listPlans, getCurrent, changePlan, cancel };
