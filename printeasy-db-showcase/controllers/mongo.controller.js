'use strict';

const { v4: uuidv4 } = require('uuid');
const { isMongoConnected } = require('../mongo/connection');

const User     = require('../mongo/models/User');
const Shop     = require('../mongo/models/Shop');
const Session  = require('../mongo/models/Session');
const File     = require('../mongo/models/File');
const PrintJob = require('../mongo/models/PrintJob');
const Payment  = require('../mongo/models/Payment');

function checkMongo(res) {
  if (!isMongoConnected()) {
    res.status(503).json({
      success: false, db: 'mongodb',
      error: 'MongoDB not connected. Set MONGODB_URI in .env and restart.'
    });
    return false;
  }
  return true;
}

// ──────── USERS ────────
exports.createUser = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { name, phone, email, deviceId } = req.body;
    const user = await User.create({ uuid: uuidv4(), name, phone, email, deviceId });
    res.status(201).json({ success: true, db: 'mongodb', data: user });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.listUsers = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, db: 'mongodb', count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.getUser = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, db: 'mongodb', error: 'User not found' });
    const sessions = await Session.find({ userId: user._id }).lean();
    res.json({ success: true, db: 'mongodb', data: { ...user, sessions } });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── SHOPS ────────
exports.createShop = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { shopName, email, contact, status, address, networkConfigs } = req.body;
    const shop = await Shop.create({
      uuid: uuidv4(), shopName, email, contact, status,
      address: address || {},
      networkConfigs: networkConfigs || []
    });
    res.status(201).json({ success: true, db: 'mongodb', data: shop });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.listShops = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, db: 'mongodb', count: shops.length, data: shops });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── SESSIONS ────────
exports.createSession = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { userId, shopId, isLocal, qrToken } = req.body;
    const session = await Session.create({
      uuid:    uuidv4(),
      userId:  userId  || null,
      shopId:  shopId  || null,
      isLocal: isLocal || false,
      qrToken: qrToken || uuidv4().replace(/-/g,'').slice(0,16).toUpperCase()
    });
    res.status(201).json({ success: true, db: 'mongodb', data: session });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── FILES ────────
exports.createFile = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { sessionId, name, type, size, pages, storage } = req.body;
    const file = await File.create({
      uuid: uuidv4(),
      sessionId,
      name, type, size, pages,
      storage: storage || { storageType: 'local', path: `/uploads/${uuidv4()}` }
    });
    res.status(201).json({ success: true, db: 'mongodb', data: file });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── PRINT JOBS ────────
exports.createPrintJob = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { fileId, sessionId, shopId, printerId, settings, origin, status, priority, cost } = req.body;

    // Determine queue position
    const queueCount = await PrintJob.countDocuments({ shopId, status: { $in: ['queued','printing'] } });

    const job = await PrintJob.create({
      uuid: uuidv4(),
      fileId, sessionId, shopId,
      printerId:     printerId || null,
      settings:      settings  || {},
      origin:        origin    || 'online',
      status:        status    || 'queued',
      queuePosition: queueCount + 1,
      priority:      priority  || 5,
      cost:          cost      !== undefined ? cost : null
    });
    res.status(201).json({ success: true, db: 'mongodb', data: job });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.listPrintJobs = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const jobs = await PrintJob.find()
      .populate('fileId', 'name type pages')
      .populate('sessionId', 'uuid')
      .populate('shopId', 'shopName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, db: 'mongodb', count: jobs.length, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── PAYMENTS ────────
exports.createPayment = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { jobId, method, amount, status, razorpayOrderId, razorpayPaymentId, gatewayTxnId, attemptNo } = req.body;
    const payment = await Payment.create({
      uuid: uuidv4(),
      jobId, method, amount,
      status:            status            || 'pending',
      razorpayOrderId:   razorpayOrderId   || null,
      razorpayPaymentId: razorpayPaymentId || null,
      gatewayTxnId:      gatewayTxnId      || null,
      attemptNo:         attemptNo         || 1,
      paidAt: (status === 'success') ? new Date() : null
    });

    if (status === 'success') {
      await PrintJob.findByIdAndUpdate(jobId, { status: 'printing' });
    }

    res.status(201).json({ success: true, db: 'mongodb', data: payment });
  } catch (err) {
    res.status(400).json({ success: false, db: 'mongodb', error: err.message });
  }
};

// ──────── REPORTS ────────
exports.revenueReport = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const pipeline = [
      { $match: { status: 'success' } },
      { $lookup: {
          from: 'printjobs', localField: 'jobId', foreignField: '_id', as: 'job'
        }
      },
      { $unwind: '$job' },
      { $lookup: {
          from: 'shops', localField: 'job.shopId', foreignField: '_id', as: 'shop'
        }
      },
      { $unwind: '$shop' },
      { $group: {
          _id:          '$shop._id',
          shopName:     { $first: '$shop.shopName' },
          total_jobs:   { $sum: 1 },
          total_revenue:{ $sum: '$amount' },
          avg_payment:  { $avg: '$amount' },
          last_paid_at: { $max: '$paidAt' }
        }
      },
      { $sort: { total_revenue: -1 } }
    ];
    const data = await Payment.aggregate(pipeline);
    res.json({
      success: true, db: 'mongodb',
      pipeline: JSON.stringify(pipeline, null, 2),
      count: data.length, data
    });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.queueStatus = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const pipeline = [
      { $match: { status: { $in: ['queued','printing'] } } },
      { $lookup: { from: 'files',    localField: 'fileId',    foreignField: '_id', as: 'file'    } },
      { $lookup: { from: 'shops',    localField: 'shopId',    foreignField: '_id', as: 'shop'    } },
      { $lookup: { from: 'sessions', localField: 'sessionId', foreignField: '_id', as: 'session' } },
      { $unwind: { path: '$file',    preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$shop',    preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
      { $project: {
          uuid: 1, status: 1, queuePosition: 1, priority: 1, cost: 1,
          createdAt: 1, settings: 1, origin: 1,
          'file.name': 1, 'file.pages': 1, 'file.type': 1,
          'shop.shopName': 1, 'session.uuid': 1
        }
      },
      { $sort: { priority: -1, queuePosition: 1 } }
    ];
    const data = await PrintJob.aggregate(pipeline);
    res.json({
      success: true, db: 'mongodb',
      pipeline: JSON.stringify(pipeline, null, 2),
      count: data.length, data
    });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.activeSessions = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const pipeline = [
      { $match: { endedAt: null } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shop' } },
      { $lookup: { from: 'files', localField: '_id',    foreignField: 'sessionId', as: 'files' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      { $project: {
          uuid: 1, startedAt: 1, isLocal: 1, qrToken: 1,
          'user.name': 1, 'user.phone': 1,
          'shop.shopName': 1, 'shop.contact': 1,
          file_count: { $size: '$files' }
        }
      },
      { $sort: { startedAt: -1 } }
    ];
    const data = await Session.aggregate(pipeline);
    res.json({
      success: true, db: 'mongodb',
      pipeline: JSON.stringify(pipeline, null, 2),
      count: data.length, data
    });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.userHistory = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, db: 'mongodb', error: 'userId required' });

    // Find sessions for this user
    const sessions = await Session.find({ userId }).select('_id').lean();
    const sessionIds = sessions.map(s => s._id);

    const pipeline = [
      { $match: { sessionId: { $in: sessionIds } } },
      { $lookup: { from: 'files',    localField: 'fileId',    foreignField: '_id', as: 'file'    } },
      { $lookup: { from: 'shops',    localField: 'shopId',    foreignField: '_id', as: 'shop'    } },
      { $lookup: { from: 'payments', localField: '_id',       foreignField: 'jobId', as: 'payments' } },
      { $unwind: { path: '$file', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      { $project: {
          uuid: 1, status: 1, cost: 1, createdAt: 1, printedAt: 1, settings: 1,
          'file.name': 1, 'file.type': 1, 'file.pages': 1,
          'shop.shopName': 1,
          payments: { $slice: ['$payments', 1] }
        }
      },
      { $sort: { createdAt: -1 } }
    ];
    const data = await PrintJob.aggregate(pipeline);
    res.json({
      success: true, db: 'mongodb',
      pipeline: JSON.stringify(pipeline, null, 2),
      count: data.length, data
    });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};

exports.shopAnalytics = async (req, res) => {
  if (!checkMongo(res)) return;
  try {
    const pipeline = [
      { $lookup: {
          from: 'payments', localField: '_id', foreignField: 'jobId', as: 'payment'
        }
      },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
      { $group: {
          _id:          '$shopId',
          total_jobs:   { $sum: 1 },
          avg_cost:     { $avg: '$cost' },
          done_jobs:    { $sum: { $cond: [{ $eq: ['$status','done'] }, 1, 0] } },
          failed_jobs:  { $sum: { $cond: [{ $eq: ['$status','failed'] }, 1, 0] } },
          total_revenue:{ $sum: { $cond: [{ $eq: ['$payment.status','success'] }, '$payment.amount', 0] } }
        }
      },
      { $lookup: { from: 'shops', localField: '_id', foreignField: '_id', as: 'shop' } },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      { $project: {
          shopName:      '$shop.shopName',
          total_jobs:    1,
          avg_cost:      { $round: ['$avg_cost', 2] },
          total_revenue: { $round: ['$total_revenue', 2] },
          success_rate:  {
            $round: [{
              $multiply: [
                { $cond: [{ $eq: ['$total_jobs', 0] }, 0,
                  { $divide: ['$done_jobs', '$total_jobs'] }
                ]},
                100
              ]
            }, 1]
          }
        }
      },
      { $sort: { total_revenue: -1 } }
    ];
    const data = await PrintJob.aggregate(pipeline);
    res.json({
      success: true, db: 'mongodb',
      pipeline: JSON.stringify(pipeline, null, 2),
      count: data.length, data
    });
  } catch (err) {
    res.status(500).json({ success: false, db: 'mongodb', error: err.message });
  }
};
