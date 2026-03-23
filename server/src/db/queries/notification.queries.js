/**
 * notification.queries.js
 */
const db = require('../index')

const NotificationQueries = {

  findByUser: async (userId, { status, limit = 20, offset = 0 } = {}) => {
    if (db._mode === 'sqlite') {
      const statusClause = status ? 'AND status = ?' : ''
      const params = status ? [userId, status, limit, offset] : [userId, limit, offset]
      return db.prepare(`
        SELECT * FROM notifications WHERE user_id = ? ${statusClause}
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(...params)
    }
    let query = db.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  findByShop: async (shopId, { limit = 20, offset = 0 } = {}) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT * FROM notifications WHERE shop_id = ? AND target_type = 'shopkeeper'
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(shopId, limit, offset)
    }
    const { data, error } = await db
      .from('notifications').select('*').eq('shop_id', shopId).eq('target_type', 'shopkeeper')
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (error) throw error
    return data
  },

  create: async (notifData) => {
    if (db._mode === 'sqlite') {
      const stmt = db.prepare(`
        INSERT INTO notifications (user_id, shop_id, target_type, type, job_id, message, status)
        VALUES (@user_id, @shop_id, @target_type, @type, @job_id, @message, 'unread')
      `)
      const result = stmt.run({ user_id: null, shop_id: null, job_id: null, ...notifData })
      return result.lastInsertRowid
    }
    const { data, error } = await db
      .from('notifications').insert({ status: 'unread', ...notifData }).select().single()
    if (error) throw error
    return data
  },

  markRead: async (notificationId) => {
    if (db._mode === 'sqlite') {
      db.prepare(`UPDATE notifications SET status = 'read' WHERE notification_id = ?`).run(notificationId)
      return
    }
    const { error } = await db.from('notifications').update({ status: 'read' }).eq('notification_id', notificationId)
    if (error) throw error
  },

  markAllReadByUser: async (userId) => {
    if (db._mode === 'sqlite') {
      db.prepare(`UPDATE notifications SET status = 'read' WHERE user_id = ? AND status = 'unread'`).run(userId)
      return
    }
    const { error } = await db.from('notifications')
      .update({ status: 'read' }).eq('user_id', userId).eq('status', 'unread')
    if (error) throw error
  },
}

module.exports = NotificationQueries
