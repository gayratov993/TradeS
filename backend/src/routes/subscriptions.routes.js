const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/subscription.controller');
const { protect } = require('../middlewares/auth.middleware');
const { resolveTenant, authorizeOrg } = require('../middlewares/tenant.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { changePlanSchema } = require('../validators/subscription.validator');

router.use(protect);

router.get('/current', resolveTenant, subscriptionController.getCurrent);
router.post(
  '/change-plan',
  resolveTenant,
  authorizeOrg('OWNER', 'MANAGER'),
  validate(changePlanSchema),
  subscriptionController.changePlan
);
router.post('/cancel', resolveTenant, authorizeOrg('OWNER', 'MANAGER'), subscriptionController.cancel);

module.exports = router;
