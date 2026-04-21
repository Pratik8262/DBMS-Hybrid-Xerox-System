'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const { name, phone, email, device_id } = data;
  const uuid = data.uuid || uuidv4();
  const stmt = db.prepare(`
    INSERT INTO users (uuid, name, phone, email, device_id)
    VALUES (@uuid, @name, @phone, @email, @device_id)
  `);
  const result = stmt.run({ uuid, name, phone, email: email || null, device_id: device_id || null });
  return { id: result.lastInsertRowid, uuid };
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT u.*,
           COUNT(DISTINCT s.session_id) AS session_count,
           COUNT(DISTINCT pj.job_id)    AS job_count
    FROM users u
    LEFT JOIN sessions s  ON s.user_id = u.user_id
    LEFT JOIN print_jobs pj ON pj.session_id = s.session_id
    GROUP BY u.user_id
    ORDER BY u.created_at DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE user_id = ?`).get(id);
  if (!user) return null;
  user.sessions = db.prepare(`
    SELECT s.*, sh.shop_name
    FROM sessions s
    LEFT JOIN shops sh ON sh.shop_id = s.shop_id
    WHERE s.user_id = ?
    ORDER BY s.started_at DESC
  `).all(id);
  return user;
}

function update(id, data) {
  const db = getDb();
  const fields = Object.keys(data).filter(k => ['name','phone','email','device_id'].includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE user_id = @id`);
  const result = stmt.run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM users WHERE user_id = ?`).run(id);
  return { changes: result.changes };
}

// Advanced: User print history — all jobs for a user with cost + status
function userPrintHistory(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      pj.job_id,
      pj.uuid         AS job_uuid,
      pj.status,
      pj.cost,
      pj.created_at,
      pj.printed_at,
      f.name          AS file_name,
      f.type          AS file_type,
      f.pages,
      sh.shop_name,
      p.amount        AS payment_amount,
      p.status        AS payment_status,
      p.method        AS payment_method
    FROM sessions s
    JOIN print_jobs pj ON pj.session_id = s.session_id
    JOIN files f        ON f.file_id     = pj.file_id
    JOIN shops sh       ON sh.shop_id    = pj.shop_id
    LEFT JOIN payments p ON p.job_id    = pj.job_id
    WHERE s.user_id = ?
    ORDER BY pj.created_at DESC
  `).all(userId);
}

module.exports = { create, findAll, findById, update, remove, userPrintHistory };
