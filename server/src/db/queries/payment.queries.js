/**
 * payment.queries.js
 * All DB operations for the `payments` table.
 */

const db = require('../index')

const PaymentQueries = {

  findById: async (paymentId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(paymentId) ?? null
    }
    const { data, error } = await db.from('payments').select('*').eq('payment_id', paymentId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM payments WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('payments').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Find payment by Razorpay order ID.
   * Called during verification to locate the pending payment row.
   */
  findByRazorpayOrderId: async (orderId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?').get(orderId) ?? null
    }
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Find payment by Razorpay payment ID.
   * Used for idempotency check in webhook handler.
   */
  findByRazorpayPaymentId: async (paymentId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?').get(paymentId) ?? null
    }
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Get all payment rows for a job.
   * Multiple rows exist when there are retries or split payments.
   */
  findByJobId: async (jobId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM payments WHERE job_id = ? ORDER BY created_at DESC
      `).all(jobId)
    }
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /**
   * Get the successful payment for a job (should be at most one).
   */
  findSuccessfulByJobId: async (jobId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM payments WHERE job_id = ? AND status = 'success' LIMIT 1
      `).get(jobId) ?? null
    }
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'success')
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Create a pending payment row when Razorpay order is created.
   * @param {Object} paymentData - { uuid, job_id, method, amount, razorpay_order_id }
   */
  create: async (paymentData) => {
    if (db._mode === 'sqlite') {
      const tx = db.transaction((data) => {
        const stmt = db.prepare(`
          INSERT INTO payments (uuid, job_id, payment_group_id, method, amount, status, razorpay_order_id)
          VALUES (@uuid, @job_id, @payment_group_id, @method, @amount, 'pending', @razorpay_order_id)
        `)
        const result = stmt.run(data)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('payment', data.uuid, 'insert', JSON.stringify(data))
        
        return result.lastInsertRowid
      })
      
      const lastId = tx({ payment_group_id: paymentData.job_id, ...paymentData })
      return PaymentQueries.findById(lastId)
    }
    const { data, error } = await db
      .from('payments')
      .insert({ status: 'pending', payment_group_id: paymentData.job_id, ...paymentData })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Mark a payment as successful after signature verification.
   * @param {number} paymentId
   * @param {Object} razorpayData - { razorpay_payment_id, razorpay_signature }
   */
  markSuccess: async (paymentId, razorpayData) => {
    const updates = {
      status: 'success',
      paid_at: new Date().toISOString(),
      gateway_txn_id: razorpayData.razorpay_payment_id,
      ...razorpayData,
    }
    if (db._mode === 'sqlite') {
      const payment = await PaymentQueries.findById(paymentId)
      if (!payment) return null

      const tx = db.transaction((data) => {
        db.prepare(`
          UPDATE payments
          SET status = 'success', paid_at = @paid_at,
              razorpay_payment_id = @razorpay_payment_id,
              razorpay_signature = @razorpay_signature,
              gateway_txn_id = @gateway_txn_id
          WHERE payment_id = @payment_id
        `).run({ ...data.updates, payment_id: data.paymentId })
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('payment', payment.uuid, 'update', JSON.stringify(data.updates))
      })
      
      tx({ paymentId, updates })
      return PaymentQueries.findById(paymentId)
    }
    const { data, error } = await db
      .from('payments')
      .update(updates)
      .eq('payment_id', paymentId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Mark a payment as failed.
   */
  markFailed: async (paymentId) => {
    if (db._mode === 'sqlite') {
      const payment = await PaymentQueries.findById(paymentId)
      if (!payment) return null

      const tx = db.transaction((id) => {
        db.prepare(`UPDATE payments SET status = 'failed' WHERE payment_id = ?`).run(id)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('payment', payment.uuid, 'update', JSON.stringify({ status: 'failed' }))
      })
      
      tx(paymentId)
      return PaymentQueries.findById(paymentId)
    }
    const { data, error } = await db
      .from('payments')
      .update({ status: 'failed' })
      .eq('payment_id', paymentId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Mark a payment as refunded.
   */
  markRefunded: async (paymentId) => {
    if (db._mode === 'sqlite') {
      const payment = await PaymentQueries.findById(paymentId)
      if (!payment) return null

      const tx = db.transaction((id) => {
        db.prepare(`UPDATE payments SET status = 'refunded' WHERE payment_id = ?`).run(id)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('payment', payment.uuid, 'update', JSON.stringify({ status: 'refunded' }))
      })
      
      tx(paymentId)
      return PaymentQueries.findById(paymentId)
    }
    const { data, error } = await db
      .from('payments')
      .update({ status: 'refunded' })
      .eq('payment_id', paymentId)
      .select()
      .single()
    if (error) throw error
    return data
  },

}

module.exports = PaymentQueries
