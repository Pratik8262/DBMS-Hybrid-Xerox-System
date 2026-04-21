'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { connectMongo } = require('./mongo/connection');
const sqlRoutes        = require('./routes/sql.routes');
const mongoRoutes      = require('./routes/mongo.routes');

// Initialize SQLite on startup (auto-creates DB + schema)
require('./sql/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/sql',   sqlRoutes);
app.use('/api/mongo', mongoRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { isMongoConnected } = require('./mongo/connection');
  res.json({
    status:   'ok',
    sqlite:   'connected',
    mongodb:  isMongoConnected() ? 'connected' : 'disconnected',
    uptime:   process.uptime().toFixed(2) + 's',
    time:     new Date().toISOString()
  });
});

// ── SPA fallback ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: err.message });
});

// ── Start ───────────────────────────────────────────────────
async function start() {
  // Attempt MongoDB connection (non-blocking — server starts even if Mongo is down)
  await connectMongo().catch(() => {});

  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   PrintEasy DB Showcase — running on :${PORT}   ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  Frontend  → http://localhost:${PORT}            ║`);
    console.log(`║  SQL API   → http://localhost:${PORT}/api/sql    ║`);
    console.log(`║  Mongo API → http://localhost:${PORT}/api/mongo  ║`);
    console.log(`║  Health    → http://localhost:${PORT}/api/health ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
}

start();
