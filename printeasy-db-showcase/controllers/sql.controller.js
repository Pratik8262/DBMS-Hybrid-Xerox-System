'use strict';

const userQ    = require('../sql/queries/users');
const shopQ    = require('../sql/queries/shops');
const sessionQ = require('../sql/queries/sessions');
const fileQ    = require('../sql/queries/files');
const jobQ     = require('../sql/queries/print_jobs');
const payQ     = require('../sql/queries/payments');

// ──────── USERS ────────
exports.createUser = (req, res) => {
  try {
    const result = userQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.listUsers = (req, res) => {
  try {
    const users = userQ.findAll();
    res.json({ success: true, db: 'sqlite', count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.getUser = (req, res) => {
  try {
    const user = userQ.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, db: 'sqlite', error: 'User not found' });
    res.json({ success: true, db: 'sqlite', data: user });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── SHOPS ────────
exports.createShop = (req, res) => {
  try {
    const result = shopQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.listShops = (req, res) => {
  try {
    const shops = shopQ.findAll();
    res.json({ success: true, db: 'sqlite', count: shops.length, data: shops });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── SESSIONS ────────
exports.createSession = (req, res) => {
  try {
    const result = sessionQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── FILES ────────
exports.createFile = (req, res) => {
  try {
    const result = fileQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── PRINT JOBS ────────
exports.createPrintJob = (req, res) => {
  try {
    const result = jobQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.listPrintJobs = (req, res) => {
  try {
    const jobs = jobQ.findAll();
    res.json({ success: true, db: 'sqlite', count: jobs.length, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── PAYMENTS ────────
exports.createPayment = (req, res) => {
  try {
    const result = payQ.create(req.body);
    res.status(201).json({ success: true, db: 'sqlite', data: result });
  } catch (err) {
    res.status(400).json({ success: false, db: 'sqlite', error: err.message });
  }
};

// ──────── REPORTS ────────
exports.revenueReport = (req, res) => {
  try {
    const data = shopQ.revenueReport();
    const query = `SELECT shops.shop_name, COUNT(pj.job_id) as total_jobs,
SUM(p.amount) as total_revenue FROM shops
JOIN print_jobs pj ON pj.shop_id = shops.shop_id
JOIN payments p ON p.job_id = pj.job_id
WHERE p.status = 'success'
GROUP BY shops.shop_id ORDER BY total_revenue DESC;`;
    res.json({ success: true, db: 'sqlite', query, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.queueStatus = (req, res) => {
  try {
    const data = jobQ.queueStatus();
    const query = `SELECT pj.*, pr.name AS printer_name FROM print_jobs pj
JOIN printers pr ON pr.printer_id = pj.printer_id
WHERE pj.status IN ('queued','printing')
ORDER BY pj.priority DESC, pj.queue_position ASC;`;
    res.json({ success: true, db: 'sqlite', query, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.activeSessions = (req, res) => {
  try {
    const data = sessionQ.activeSessions();
    const query = `SELECT s.*, u.name AS user_name, sh.shop_name, COUNT(f.file_id) AS file_count
FROM sessions s
LEFT JOIN users u ON u.user_id = s.user_id
LEFT JOIN shops sh ON sh.shop_id = s.shop_id
LEFT JOIN files f ON f.session_id = s.session_id
WHERE s.ended_at IS NULL GROUP BY s.session_id;`;
    res.json({ success: true, db: 'sqlite', query, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.userHistory = (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, db: 'sqlite', error: 'userId query param required' });
    const data = userQ.userPrintHistory(userId);
    const query = `SELECT pj.*, f.name AS file_name, sh.shop_name, p.amount, p.status AS pay_status
FROM sessions s JOIN print_jobs pj ON pj.session_id = s.session_id
JOIN files f ON f.file_id = pj.file_id JOIN shops sh ON sh.shop_id = pj.shop_id
LEFT JOIN payments p ON p.job_id = pj.job_id
WHERE s.user_id = ${userId} ORDER BY pj.created_at DESC;`;
    res.json({ success: true, db: 'sqlite', query, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};

exports.pricingLookup = (req, res) => {
  try {
    const { shop_id, color_type = 'bw', paper_size = 'A4', finishing_type = 'none' } = req.query;
    if (!shop_id) return res.status(400).json({ success: false, db: 'sqlite', error: 'shop_id required' });
    const data = shopQ.pricingLookup({ shop_id, color_type, paper_size, finishing_type });
    res.json({ success: true, db: 'sqlite', data });
  } catch (err) {
    res.status(500).json({ success: false, db: 'sqlite', error: err.message });
  }
};
