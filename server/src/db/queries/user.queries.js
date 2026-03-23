/**
 * user.queries.js
 * All DB operations for the `users` table.
 * No business logic here — pure DB access only.
 */

const db = require('../index')

const UserQueries = {

  /**
   * Find a user by their internal integer PK.
   * Used after JWT decode (token carries user_id).
   */
  findById: async (userId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) ?? null
    }
    const { data, error } = await db.from('users').select('*').eq('user_id', userId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Find a user by their UUID — used during cross-server sync.
   */
  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM users WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('users').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Find a user by phone. Used at login / registration.
   */
  findByPhone: async (phone) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) ?? null
    }
    const { data, error } = await db.from('users').select('*').eq('phone', phone).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Find a user by email.
   */
  findByEmail: async (email) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null
    }
    const { data, error } = await db.from('users').select('*').eq('email', email).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  /**
   * Create a new user.
   * @param {Object} userData - { uuid, name, phone, email?, device_id? }
   */
  create: async (userData) => {
    if (db._mode === 'sqlite') {
      const tx = db.transaction((data) => {
        const stmt = db.prepare(`
          INSERT INTO users (uuid, name, phone, email, device_id)
          VALUES (@uuid, @name, @phone, @email, @device_id)
        `)
        const result = stmt.run(data)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('user', data.uuid, 'insert', JSON.stringify(data))
        
        return result.lastInsertRowid
      })
      
      const lastId = tx(userData)
      return UserQueries.findById(lastId)
    }
    const { data, error } = await db.from('users').insert(userData).select().single()
    if (error) throw error
    return data
  },

  /**
   * Update user profile fields.
   * @param {number} userId
   * @param {Object} updates - Partial { name, email, device_id }
   */
  update: async (userId, updates) => {
    if (db._mode === 'sqlite') {
      const user = await UserQueries.findById(userId)
      if (!user) return null

      const tx = db.transaction((data) => {
        const fields = Object.keys(data.updates).map(k => `${k} = @${k}`).join(', ')
        db.prepare(`UPDATE users SET ${fields} WHERE user_id = @user_id`)
          .run({ ...data.updates, user_id: data.userId })
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('user', user.uuid, 'update', JSON.stringify(data.updates))
      })
      
      tx({ userId, updates })
      return UserQueries.findById(userId)
    }
    const { data, error } = await db.from('users').update(updates).eq('user_id', userId).select().single()
    if (error) throw error
    return data
  },

  /**
   * Update the device_id on every login (tracks last device used).
   */
  updateDeviceId: async (userId, deviceId) => {
    return UserQueries.update(userId, { device_id: deviceId })
  },

  /**
   * Get user statistics: total jobs and total money spent.
   * @param {number} userId
   */
  getStats: async (userId) => {
    if (db._mode === 'sqlite') {
      let cloudStats = { total_uploads: 0, total_spent: 0 }
      
      // Try fetching from online server if URL is configured
      const onlineUrl = process.env.ONLINE_SERVER_URL
      if (onlineUrl) {
        try {
          const axios = require('axios')
          const res = await axios.get(`${onlineUrl}/users/stats/${userId}`, {
            headers: { 'x-sync-secret': process.env.ONLINE_SYNC_SECRET },
            timeout: 5000
          })
          if (res.data?.success) {
            cloudStats = res.data.data
          }
        } catch (err) {
          // Silent fail on cloud fetch, fallback to local
        }
      }

      const localStats = db.prepare(`
        SELECT 
          COUNT(pj.job_id) as total_jobs,
          SUM(pj.cost) as total_spent
        FROM print_jobs pj
        JOIN sessions s ON pj.session_id = s.session_id
        WHERE s.user_id = ? AND pj.status != 'cancelled'
      `).get(userId)

      return {
        total_uploads: Math.max(cloudStats.total_uploads, localStats.total_jobs || 0),
        total_spent: Math.max(cloudStats.total_spent, localStats.total_spent || 0)
      }
    }
    
    // Supabase (Postgres)
    const { data: jobs, error } = await db
      .from('print_jobs')
      .select('cost, sessions!inner(user_id)')
      .eq('sessions.user_id', userId)
      .neq('status', 'cancelled')

    if (error) throw error

    const total_uploads = jobs.length
    const total_spent = jobs.reduce((sum, j) => sum + parseFloat(j.cost || 0), 0)

    return { total_uploads, total_spent }
  },

}

module.exports = UserQueries
