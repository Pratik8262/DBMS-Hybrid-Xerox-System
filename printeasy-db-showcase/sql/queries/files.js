'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const {
    session_id, name, type, size, pages,
    storage_type = 'local', path: filePath, checksum, expiry_at, shop_id
  } = data;
  const uuid = data.uuid || uuidv4();

  const insertFile = db.transaction(() => {
    // Create storage record first
    const storageStmt = db.prepare(`
      INSERT INTO storage (shop_id, storage_type, path, checksum, expiry_at)
      VALUES (@shop_id, @storage_type, @path, @checksum, @expiry_at)
    `);
    const storageResult = storageStmt.run({
      shop_id:      shop_id      || null,
      storage_type: storage_type,
      path:         filePath     || `/uploads/${uuid}`,
      checksum:     checksum     || null,
      expiry_at:    expiry_at    || null
    });
    const storage_id = storageResult.lastInsertRowid;

    // Create the file record
    const fileStmt = db.prepare(`
      INSERT INTO files (uuid, storage_id, session_id, name, type, size, pages)
      VALUES (@uuid, @storage_id, @session_id, @name, @type, @size, @pages)
    `);
    const fileResult = fileStmt.run({
      uuid, storage_id, session_id, name, type, size, pages: pages || null
    });

    // Log upload activity
    try {
      const session = db.prepare(`SELECT user_id, shop_id FROM sessions WHERE session_id = ?`).get(session_id);
      if (session) {
        db.prepare(`
          INSERT INTO activity_log (session_id, user_id, shop_id, event_type, description)
          VALUES (@session_id, @user_id, @shop_id, 'upload', 'File uploaded: ' || @name)
        `).run({ session_id, user_id: session.user_id, shop_id: session.shop_id, name });
      }
    } catch (_) { /* ignore */ }

    return { id: fileResult.lastInsertRowid, uuid, storage_id };
  });

  return insertFile();
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT
      f.*,
      st.storage_type,
      st.path     AS storage_path,
      st.checksum,
      s.uuid      AS session_uuid,
      u.name      AS user_name
    FROM files f
    JOIN storage st   ON st.storage_id  = f.storage_id
    JOIN sessions s   ON s.session_id   = f.session_id
    LEFT JOIN users u ON u.user_id      = s.user_id
    ORDER BY f.uploaded_at DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  const file = db.prepare(`
    SELECT f.*, st.storage_type, st.path AS storage_path, st.checksum, st.expiry_at
    FROM files f
    JOIN storage st ON st.storage_id = f.storage_id
    WHERE f.file_id = ?
  `).get(id);
  if (!file) return null;
  file.print_jobs = db.prepare(`SELECT * FROM print_jobs WHERE file_id = ?`).all(id);
  return file;
}

function update(id, data) {
  const db = getDb();
  const fields = Object.keys(data).filter(k => ['name','type','size','pages','status'].includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const result = db.prepare(`UPDATE files SET ${setClause} WHERE file_id = @id`).run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM files WHERE file_id = ?`).run(id);
  return { changes: result.changes };
}

module.exports = { create, findAll, findById, update, remove };
