/* eslint-env node */
const express = require('express');
const { getFee } = require('../controllers/fee.controller');

const router = express.Router();

router.get('/', getFee);

module.exports = router;
