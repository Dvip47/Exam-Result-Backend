const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { createPageValidator, updatePageValidator, pageIdValidator } = require('../validators/page.validator');
const validate = require('../middleware/validation.middleware');
const { USER_ROLES } = require('../config/constants');

router.get('/', authenticateToken, authorizeRole(USER_ROLES.ADMIN), pageController.getAllPages);
router.post('/', authenticateToken, authorizeRole(USER_ROLES.ADMIN), createPageValidator, validate, pageController.createPage);
router.get('/:id', authenticateToken, authorizeRole(USER_ROLES.ADMIN), pageIdValidator, validate, pageController.getPageById);
router.put('/:id', authenticateToken, authorizeRole(USER_ROLES.ADMIN), updatePageValidator, validate, pageController.updatePage);
router.delete('/:id', authenticateToken, authorizeRole(USER_ROLES.ADMIN), pageIdValidator, validate, pageController.deletePage);

module.exports = router;
