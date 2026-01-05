const express = require('express');
const router = express.Router();
const pageController = require('../../controllers/page.controller');
const { pageSlugValidator } = require('../../validators/page.validator');
const validate = require('../../middleware/validation.middleware');

router.get('/:slug', pageSlugValidator, validate, pageController.getPageBySlug);

module.exports = router;
