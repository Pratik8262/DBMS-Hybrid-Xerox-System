'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const { user_id, shop_id, network_id, is_local = 0, qr_token } = data;
  const uuid = data.uuid || uuidv4();

  const stmt = db.prepare(`
    INSERT INTO sessions (uuid, user_id, shop_id, network_id, is_local, qr_token)
    VALUES (@uuid, @user_id, @shop_id, @network_id, @is_local, @qr_token)
  `);
  const result = stmt.run({
    uuid,
    user_id:    user_id    || null,
    shop_id:    shop_id    || null,
    network_id: network_id || null,
    is_local:   is_local   ? 1 : 0,
    qr_token:   qr_token   || uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()
  });

  // Log activity
  if (result.lastInsertRowid) {
    try {
      db.prepare(`
        INSERT INTO activity_log (session_id, user_id, shop_id, event_type, description)
        VALUES (@session_id, @user_id, @shop_id, 'login', 'Session started')
      `).run({ session_id: result.lastInsertRowid, user_id: user_id || null, shop_id: shop_id || null });
    } catch (_) { /* ignore log errors */ }
  }

  return { id: result.lastInsertRowid, uuid };
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT
      s.*,
      u.name           AS user_name,
      u.phone          AS user_phone,
      sh.shop_name,
      COUNT(f.file_id) AS file_count
    FROM sessions s
    LEFT JOIN users u    ON u.user_id  = s.user_id
    LEFT JOIN shops sh   ON sh.shop_id = s.shop_id
    LEFT JOIN files f    ON f.session_id = s.session_id
    GROUP BY s.session_id
    ORDER BY s.started_at DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.name AS user_name, sh.shop_name
    FROM sessions s
    LEFT JOIN users u  ON u.user_id  = s.user_id
    LEFT JOIN shops sh ON sh.shop_id = s.shop_id
    WHERE s.session_id = ?
  `).get(id);
  if (!session) return null;
  session.files = db.prepare(`SELECT * FROM files WHERE session_id = ?`).all(id);
  session.jobs  = db.prepare(`SELECT * FROM print_jobs WHERE session_id = ?`).all(id);
  return session;
}

function update(id, data) {
  const db = getDb();
  const fields = Object.keys(data).filter(k => ['ended_at','qr_used_at','is_local'].includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const result = db.prepare(`UPDATE sessions SET ${setClause} WHERE session_id = @id`).run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM sessions WHERE session_id = ?`).run(id);
  return { changes: result.changes };
}

// Advanced: Active sessions with user + shop + file count
function activeSessions() {
  const db = getDb();
  return db.prepare(`
    SELECT
      s.session_id,
      s.uuid           AS session_uuid,
      s.started_at,
      s.is_local,
      s.qr_token,
      u.name           AS user_name,
      u.phone          AS user_phone,
      sh.shop_name,
      sh.contact       AS shop_contact,
      COUNT(f.file_id) AS file_count,
      COUNT(pj.job_id) AS job_count
    FROM sessions s
    LEFT JOIN users u      ON u.user_id    = s.user_id
    LEFT JOIN shops sh     ON sh.shop_id   = s.shop_id
    LEFT JOIN files f      ON f.session_id = s.session_id
    LEFT JOIN print_jobs pj ON pj.session_id = s.session_id
    WHERE s.ended_at IS NULL
    GROUP BY s.session_id
    ORDER BY s.started_at DESC
  `).all();
}

module.exports = { create, findAll, findById, update, remove, activeSessions };
