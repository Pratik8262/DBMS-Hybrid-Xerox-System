'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/printeasy';

let isConnected = false;

async function connectMongo() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
  } catch (err) {
    console.warn(`[MongoDB] Connection failed: ${err.message}`);
    console.warn('[MongoDB] Mongo routes will return 503 until database is reachable.');
    isConnected = false;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[MongoDB] Reconnected.');
});

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectMongo, isMongoConnected };
