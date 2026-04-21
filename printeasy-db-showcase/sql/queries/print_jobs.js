'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const {
    file_id, printer_id, settings_id, session_id, shop_id,
    origin = 'online', status = 'queued', priority = 5,
    cost, color_mode = 'bw', orientation = 'portrait',
    scaling = 'fit', sides = 'simplex', paper_size = 'A4', copies = 1,
    user_id
  } = data;
  const uuid = data.uuid || uuidv4();

  const insertJob = db.transaction(() => {
    // Create print_settings if not provided
    let resolvedSettingsId = settings_id;
    if (!resolvedSettingsId) {
      const settingsResult = db.prepare(`
        INSERT INTO print_settings (user_id, color_mode, orientation, scaling, sides, paper_size, copies)
        VALUES (@user_id, @color_mode, @orientation, @scaling, @sides, @paper_size, @copies)
      `).run({ user_id: user_id || null, color_mode, orientation, scaling, sides, paper_size, copies });
      resolvedSettingsId = settingsResult.lastInsertRowid;
    }

    // Determine queue position
    const queueRow = db.prepare(`
      SELECT COUNT(*) AS cnt FROM print_jobs
      WHERE shop_id = @shop_id AND status IN ('queued','printing')
    `).get({ shop_id });
    const queue_position = (queueRow.cnt || 0) + 1;

    const jobStmt = db.prepare(`
      INSERT INTO print_jobs
        (uuid, file_id, printer_id, settings_id, session_id, shop_id,
         origin, status, queue_position, priority, cost)
      VALUES
        (@uuid, @file_id, @printer_id, @settings_id, @session_id, @shop_id,
         @origin, @status, @queue_position, @priority, @cost)
    `);
    const jobResult = jobStmt.run({
      uuid, file_id, printer_id, settings_id: resolvedSettingsId,
      session_id, shop_id, origin, status, queue_position,
      priority, cost: cost !== undefined ? cost : null
    });
    const job_id = jobResult.lastInsertRowid;

    // Log activity
    try {
      const session = db.prepare(`SELECT user_id, shop_id FROM sessions WHERE session_id = ?`).get(session_id);
      if (session) {
        db.prepare(`
          INSERT INTO activity_log (session_id, user_id, shop_id, event_type, description)
          VALUES (@session_id, @user_id, @shop_id, 'print', 'Print job queued at position ' || @pos)
        `).run({ session_id, user_id: session.user_id, shop_id: session.shop_id, pos: queue_position });
      }
    } catch (_) { /* ignore */ }

    return { id: job_id, uuid, settings_id: resolvedSettingsId, queue_position };
  });

  return insertJob();
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT
      pj.*,
      f.name          AS file_name,
      f.type          AS file_type,
      f.pages,
      sh.shop_name,
      pr.name         AS printer_name,
      pr.status       AS printer_status,
      ps.color_mode,
      ps.paper_size,
      ps.copies
    FROM print_jobs pj
    JOIN files f          ON f.file_id      = pj.file_id
    JOIN shops sh         ON sh.shop_id     = pj.shop_id
    JOIN printers pr      ON pr.printer_id  = pj.printer_id
    LEFT JOIN print_settings ps ON ps.settings_id = pj.settings_id
    ORDER BY pj.created_at DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  const job = db.prepare(`
    SELECT pj.*, f.name AS file_name, sh.shop_name, pr.name AS printer_name,
           ps.color_mode, ps.paper_size, ps.copies, ps.sides
    FROM print_jobs pj
    JOIN files f              ON f.file_id      = pj.file_id
    JOIN shops sh             ON sh.shop_id     = pj.shop_id
    JOIN printers pr          ON pr.printer_id  = pj.printer_id
    LEFT JOIN print_settings ps ON ps.settings_id = pj.settings_id
    WHERE pj.job_id = ?
  `).get(id);
  if (!job) return null;
  job.payments = db.prepare(`SELECT * FROM payments WHERE job_id = ?`).all(id);
  return job;
}

function update(id, data) {
  const db = getDb();
  const allowed = ['status','queue_position','priority','cost','error_code','printed_at','retry_count'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const result = db.prepare(`UPDATE print_jobs SET ${setClause} WHERE job_id = @id`).run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM print_jobs WHERE job_id = ?`).run(id);
  return { changes: result.changes };
}

// Advanced: Queue status — all queued/printing jobs with printer info
function queueStatus() {
  const db = getDb();
  return db.prepare(`
    SELECT
      pj.job_id,
      pj.uuid           AS job_uuid,
      pj.status,
      pj.queue_position,
      pj.priority,
      pj.cost,
      pj.created_at,
      pj.origin,
      f.name            AS file_name,
      f.pages,
      sh.shop_name,
      pr.name           AS printer_name,
      pr.ip_address     AS printer_ip,
      pr.status         AS printer_status,
      ps.color_mode,
      ps.paper_size,
      ps.copies
    FROM print_jobs pj
    JOIN files f              ON f.file_id      = pj.file_id
    JOIN shops sh             ON sh.shop_id     = pj.shop_id
    JOIN printers pr          ON pr.printer_id  = pj.printer_id
    LEFT JOIN print_settings ps ON ps.settings_id = pj.settings_id
    WHERE pj.status IN ('queued', 'printing')
    ORDER BY pj.priority DESC, pj.queue_position ASC
  `).all();
}

module.exports = { create, findAll, findById, update, remove, queueStatus };
