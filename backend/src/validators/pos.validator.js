const Joi = require('joi');

const paymentMethod = Joi.string().valid('CASH', 'CARD', 'MIXED');

const createTransactionSchema = Joi.object({
  customerId: Joi.string(),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        discount: Joi.number().min(0).default(0),
      })
    )
    .required(),
  payments: Joi.array()
    .min(1)
    .items(
      Joi.object({
        method: paymentMethod.required(),
        amount: Joi.number().positive().required(),
        reference: Joi.string().trim().max(100).allow('').default(''),
      })
    )
    .required(),
  discountAmount: Joi.number().min(0).default(0),
  note: Joi.string().trim().max(500).allow('').default(''),
  syncId: Joi.string().trim().max(100),
  isFromOffline: Joi.boolean().default(false),
});

const openShiftSchema = Joi.object({
  openingCash: Joi.number().min(0).default(0),
  notes: Joi.string().trim().max(500).allow('').default(''),
});

const closeShiftSchema = Joi.object({
  closingCash: Joi.number().min(0).required(),
  notes: Joi.string().trim().max(500).allow('').default(''),
});

const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required(),
  phone: Joi.string().trim().max(30).allow('').default(''),
  email: Joi.string().trim().email().allow('').default(''),
  notes: Joi.string().trim().max(1000).allow('').default(''),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150),
  phone: Joi.string().trim().max(30).allow(''),
  email: Joi.string().trim().email().allow(''),
  notes: Joi.string().trim().max(1000).allow(''),
  isActive: Joi.boolean(),
});

const createReturnSchema = Joi.object({
  transactionId: Joi.string().required(),
  reason: Joi.string().trim().max(500).allow('').default(''),
  items: Joi.array()
    .min(1)
    .items(
      Joi.object({
        saleId: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        reason: Joi.string().trim().max(300).allow('').default(''),
      })
    )
    .required(),
});

module.exports = {
  createTransactionSchema,
  openShiftSchema,
  closeShiftSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createReturnSchema,
};
