'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const {
    job_id, method, amount, status = 'pending',
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    gateway_txn_id, attempt_no = 1, paid_at
  } = data;
  const uuid = data.uuid || uuidv4();

  const insertPayment = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO payments
        (uuid, job_id, method, amount, status,
         razorpay_order_id, razorpay_payment_id, razorpay_signature,
         gateway_txn_id, attempt_no, paid_at)
      VALUES
        (@uuid, @job_id, @method, @amount, @status,
         @razorpay_order_id, @razorpay_payment_id, @razorpay_signature,
         @gateway_txn_id, @attempt_no, @paid_at)
    `);
    const result = stmt.run({
      uuid, job_id, method, amount, status,
      razorpay_order_id:   razorpay_order_id   || null,
      razorpay_payment_id: razorpay_payment_id || null,
      razorpay_signature:  razorpay_signature  || null,
      gateway_txn_id:      gateway_txn_id      || null,
      attempt_no,
      paid_at: paid_at || (status === 'success' ? new Date().toISOString() : null)
    });

    // If payment is successful, update the print job and send notification
    if (status === 'success') {
      db.prepare(`UPDATE print_jobs SET status = 'printing' WHERE job_id = ? AND status = 'queued'`).run(job_id);

      // Add notification
      const job = db.prepare(`
        SELECT pj.session_id, s.user_id, pj.shop_id FROM print_jobs pj
        JOIN sessions s ON s.session_id = pj.session_id
        WHERE pj.job_id = ?
      `).get(job_id);

      if (job) {
        db.prepare(`
          INSERT INTO notifications (user_id, shop_id, target_type, type, job_id, message)
          VALUES (@user_id, @shop_id, 'customer', 'payment', @job_id, 'Payment of ₹' || @amount || ' received successfully')
        `).run({ user_id: job.user_id, shop_id: job.shop_id, job_id, amount });

        // Log in outbox
        db.prepare(`
          INSERT INTO activity_log (session_id, user_id, shop_id, event_type, description)
          VALUES (@session_id, @user_id, @shop_id, 'payment', 'Payment of ₹' || @amount || ' via ' || @method)
        `).run({ session_id: job.session_id, user_id: job.user_id, shop_id: job.shop_id, amount, method });
      }
    }

    return { id: result.lastInsertRowid, uuid };
  });

  return insertPayment();
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.*,
      pj.uuid        AS job_uuid,
      pj.status      AS job_status,
      pj.cost        AS job_cost,
      f.name         AS file_name,
      sh.shop_name,
      u.name         AS user_name
    FROM payments p
    JOIN print_jobs pj ON pj.job_id    = p.job_id
    JOIN files f       ON f.file_id    = pj.file_id
    JOIN shops sh      ON sh.shop_id   = pj.shop_id
    JOIN sessions s    ON s.session_id = pj.session_id
    LEFT JOIN users u  ON u.user_id    = s.user_id
    ORDER BY p.paid_at DESC NULLS LAST, p.payment_id DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, pj.uuid AS job_uuid, pj.status AS job_status,
           f.name AS file_name, sh.shop_name
    FROM payments p
    JOIN print_jobs pj ON pj.job_id  = p.job_id
    JOIN files f       ON f.file_id  = pj.file_id
    JOIN shops sh      ON sh.shop_id = pj.shop_id
    WHERE p.payment_id = ?
  `).get(id);
}

function update(id, data) {
  const db = getDb();
  const allowed = ['status','razorpay_payment_id','razorpay_signature','gateway_txn_id','paid_at','attempt_no'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const result = db.prepare(`UPDATE payments SET ${setClause} WHERE payment_id = @id`).run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM payments WHERE payment_id = ?`).run(id);
  return { changes: result.changes };
}

module.exports = { create, findAll, findById, update, remove };
