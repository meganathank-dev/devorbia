const express = require('express');
const OrganizationController = require('../controllers/organization.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Require authentication for all endpoints below
router.use(requireAuth);

// Get user's active organizations
router.get('/my', OrganizationController.getMyOrganizations);

module.exports = router;
