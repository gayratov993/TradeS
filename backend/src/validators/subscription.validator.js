const Joi = require('joi');

const changePlanSchema = Joi.object({
  planCode: Joi.string().valid('BASIC', 'STANDARD', 'PRO').required(),
  periodDays: Joi.number().integer().min(1).max(365).default(30),
});

module.exports = { changePlanSchema };
