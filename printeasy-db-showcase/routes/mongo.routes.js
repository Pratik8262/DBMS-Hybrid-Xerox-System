'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mongo.controller');

// Users
router.post('/users',         ctrl.createUser);
router.get('/users',          ctrl.listUsers);
router.get('/users/:id',      ctrl.getUser);

// Shops
router.post('/shops',         ctrl.createShop);
router.get('/shops',          ctrl.listShops);

// Sessions
router.post('/sessions',      ctrl.createSession);

// Files
router.post('/files',         ctrl.createFile);

// Print Jobs
router.post('/print-jobs',    ctrl.createPrintJob);
router.get('/print-jobs',     ctrl.listPrintJobs);

// Payments
router.post('/payments',      ctrl.createPayment);

// Reports
router.get('/reports/revenue',      ctrl.revenueReport);
router.get('/reports/queue',        ctrl.queueStatus);
router.get('/reports/sessions',     ctrl.activeSessions);
router.get('/reports/history',      ctrl.userHistory);
router.get('/reports/analytics',    ctrl.shopAnalytics);

module.exports = router;
