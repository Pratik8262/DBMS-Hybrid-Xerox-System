/**
 * printJob.queries.js
 * All DB operations for the `print_jobs` table.
 */

const db = require('../index')

const PrintJobQueries = {

  findById: async (jobId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM print_jobs WHERE job_id = ?').get(jobId) ?? null
    }
    const { data, error } = await db.from('print_jobs').select('*').eq('job_id', jobId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM print_jobs WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('print_jobs').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Get all jobs for a shop — shopkeeper dashboard query.
   * Supports optional status filter and pagination.
   */
  findByShop: async (shopId, { status, limit = 20, offset = 0 } = {}) => {
    if (db._mode === 'sqlite') {
      const statusClause = status ? 'AND status = ?' : ''
      const params = status ? [shopId, status, limit, offset] : [shopId, limit, offset]
      return db.prepare(`
        SELECT pj.*, f.name AS file_name, f.pages, ps.color_mode, ps.paper_size, ps.copies
        FROM print_jobs pj
        JOIN files f ON f.file_id = pj.file_id
        JOIN print_settings ps ON ps.settings_id = pj.settings_id
        WHERE pj.shop_id = ? ${statusClause}
        ORDER BY pj.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params)
    }
    let query = db
      .from('print_jobs')
      .select(`*, files(name, pages), print_settings(color_mode, paper_size, copies)`)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * Get all jobs for a session — customer job history.
   */
  findBySession: async (sessionId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT pj.*, f.name AS file_name, f.pages
        FROM print_jobs pj
        JOIN files f ON f.file_id = pj.file_id
        WHERE pj.session_id = ?
        ORDER BY pj.created_at DESC
      `).all(sessionId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .select('*, files(name, pages)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /**
   * Get all historical jobs for a specific user across all sessions.
   */
  findByUser: async (userId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT pj.*, f.name AS file_name, f.pages, s.shop_name 
        FROM print_jobs pj
        JOIN files f ON f.file_id = pj.file_id
        JOIN shops s ON s.shop_id = pj.shop_id
        JOIN sessions sess ON sess.session_id = pj.session_id
        WHERE sess.user_id = ?
        ORDER BY pj.created_at DESC
      `).all(userId)
    }
    // Supabase: filter via sessions join
    const { data, error } = await db
      .from('print_jobs')
      .select('*, files(name, pages), shops(shop_name), sessions(user_id)')
      .eq('sessions.user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    // Normalize: flatten nested shops object into shop_name field
    return (data || []).map(job => ({
      ...job,
      shop_name: job.shops?.shop_name ?? job.shop_name ?? null,
      file_name: job.files?.name ?? job.file_name ?? null,
      pages: job.files?.pages ?? job.pages ?? null,
    }))
  },

  /**
   * Get queued jobs for a specific printer — used by printer worker.
   */
  findPendingByPrinter: async (printerId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM print_jobs
        WHERE printer_id = ? AND status = 'queued'
        ORDER BY priority ASC, created_at ASC
      `).all(printerId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .select('*')
      .eq('printer_id', printerId)
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  /**
   * Create a new print job.
   * @param {Object} jobData - { uuid, file_id, printer_id, settings_id, session_id, shop_id, origin, cost?, priority? }
   */
  create: async (jobData) => {
    if (db._mode === 'sqlite') {
      const tx = db.transaction((data) => {
        const stmt = db.prepare(`
          INSERT INTO print_jobs
            (uuid, file_id, printer_id, settings_id, session_id, shop_id, origin, status, cost, priority, payment_group_id)
          VALUES
            (@uuid, @file_id, @printer_id, @settings_id, @session_id, @shop_id, @origin, @status, @cost, @priority, @payment_group_id)
        `)
        const result = stmt.run(data)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('print_job', data.uuid, 'insert', JSON.stringify(data))
        
        return result.lastInsertRowid
      })
      
      const lastId = tx({ origin: 'online', status: 'queued', cost: null, priority: 5, payment_group_id: null, ...jobData })
      return PrintJobQueries.findById(lastId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .insert({ origin: 'online', status: 'queued', cost: null, priority: 5, ...jobData })
      .select()
      .single()
    if (error) throw error
    return data
  },

  updateStatusByGroupId: async (groupId, status) => {
    if (db._mode === 'sqlite') {
      const jobs = db.prepare('SELECT * FROM print_jobs WHERE payment_group_id = ?').all(groupId)
      const tx = db.transaction((data) => {
        db.prepare(`UPDATE print_jobs SET status = ? WHERE payment_group_id = ?`).run(data.status, data.groupId)
        
        // Atomic outbox writes for each job in the group
        const outboxStmt = db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `)
        for (const job of jobs) {
           outboxStmt.run('print_job', job.uuid, 'update', JSON.stringify({ status: data.status }))
        }
      })
      tx({ groupId, status })
      return { success: true }
    }
    const { error } = await db
      .from('print_jobs')
      .update({ status })
      .eq('payment_group_id', groupId)
    if (error) throw error
    return { success: true }
  },

  /**
   * Update the status of a job.
   * Valid transitions: queued → printing → done | failed | cancelled
   */
  updateStatus: async (jobId, status, extra = {}) => {
    const updates = { status, ...extra }
    if (status === 'done') updates.printed_at = new Date().toISOString()
    if (db._mode === 'sqlite') {
      const job = await PrintJobQueries.findById(jobId)
      if (!job) return null

      const tx = db.transaction((data) => {
        const fields = Object.keys(data.updates).map(k => `${k} = @${k}`).join(', ')
        db.prepare(`UPDATE print_jobs SET ${fields} WHERE job_id = @job_id`)
          .run({ ...data.updates, job_id: data.jobId })
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('print_job', job.uuid, 'update', JSON.stringify(data.updates))
      })
      
      tx({ jobId, updates })
      return PrintJobQueries.findById(jobId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .update(updates)
      .eq('job_id', jobId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Set the calculated cost on a job.
   * Called after print_job_pricing rows are inserted.
   */
  updateCost: async (jobId, cost) => {
    if (db._mode === 'sqlite') {
      const job = await PrintJobQueries.findById(jobId)
      if (!job) return null

      const tx = db.transaction((data) => {
        db.prepare('UPDATE print_jobs SET cost = ? WHERE job_id = ?').run(data.cost, data.jobId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('print_job', job.uuid, 'update', JSON.stringify({ cost: data.cost }))
      })
      
      tx({ jobId, cost })
      return PrintJobQueries.findById(jobId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .update({ cost })
      .eq('job_id', jobId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Find jobs that are 'done' or 'cancelled' and older than N hours.
   * Used for file cleanup (Rule 10).
   */
  findOldCompleted: async (hours = 24) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM print_jobs 
        WHERE status IN ('done', 'cancelled')
          AND updated_at <= datetime('now', '-' || ? || ' hours')
      `).all(hours)
    }
    
    // Supabase
    const { data, error } = await db
      .from('print_jobs')
      .select('*')
      .in('status', ['done', 'cancelled'])
      .lte('updated_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    
    if (error) throw error
    return data
  },

  /**
   * Increment retry counter and optionally set error code.
   */
  incrementRetry: async (jobId, errorCode = null) => {
    if (db._mode === 'sqlite') {
      db.prepare(`
        UPDATE print_jobs
        SET retry_count = retry_count + 1, error_code = ?
        WHERE job_id = ?
      `).run(errorCode, jobId)
      return PrintJobQueries.findById(jobId)
    }
    const { data, error } = await db.rpc('increment_job_retry', { p_job_id: jobId, p_error_code: errorCode })
    if (error) throw error
    return data
  },

  cancel: async (jobId) => {
    return PrintJobQueries.updateStatus(jobId, 'cancelled')
  },

}

module.exports = PrintJobQueries
