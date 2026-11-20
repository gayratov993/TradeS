const Joi = require('joi');

const createOrganizationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  slug: Joi.string().trim().lowercase().max(80).pattern(/^[a-z0-9-]+$/),
  address: Joi.string().trim().max(300).allow('').default(''),
  phone: Joi.string().trim().max(30).allow('').default(''),
  currency: Joi.string().trim().length(3).uppercase().default('UZS'),
  taxRate: Joi.number().min(0).max(100).default(0),
  taxEnabled: Joi.boolean().default(false),
  ownerUserId: Joi.string().trim(),
});

const updateOrganizationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  address: Joi.string().trim().max(300).allow(''),
  phone: Joi.string().trim().max(30).allow(''),
  currency: Joi.string().trim().length(3).uppercase(),
  taxRate: Joi.number().min(0).max(100),
  taxEnabled: Joi.boolean(),
  subscriptionStatus: Joi.string().valid('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED'),
  currentPeriodEndsAt: Joi.date().iso().allow(null),
});

const createStoreSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  code: Joi.string().trim().min(1).max(30).required(),
  address: Joi.string().trim().max(300).allow('').default(''),
  phone: Joi.string().trim().max(30).allow('').default(''),
});

const updateStoreSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  address: Joi.string().trim().max(300).allow(''),
  phone: Joi.string().trim().max(30).allow(''),
  isActive: Joi.boolean(),
});

const createRegisterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  code: Joi.string().trim().min(1).max(30).required(),
});

const updateRegisterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  isActive: Joi.boolean(),
});

const addMemberSchema = Joi.object({
  userId: Joi.string().trim(),
  email: Joi.string().trim().email(),
  phone: Joi.string().trim().max(30),
  role: Joi.string().valid('MANAGER', 'CASHIER').default('CASHIER'),
}).xor('userId', 'email', 'phone');

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('MANAGER', 'CASHIER'),
  isActive: Joi.boolean(),
}).min(1);

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
  createStoreSchema,
  updateStoreSchema,
  createRegisterSchema,
  updateRegisterSchema,
  addMemberSchema,
  updateMemberSchema,
};
