const express = require('express');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rate-limit.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', requireAuth, AuthController.logoutAll);
router.get('/me', requireAuth, AuthController.getCurrentUser);

module.exports = router;
