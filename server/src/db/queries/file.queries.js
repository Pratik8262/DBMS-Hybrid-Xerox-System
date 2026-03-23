/**
 * file.queries.js
 */
const db = require('../index')

const FileQueries = {

  findById: async (fileId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM files WHERE file_id = ?').get(fileId) ?? null
    }
    const { data, error } = await db.from('files').select('*').eq('file_id', fileId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findByUuid: async (uuid) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM files WHERE uuid = ?').get(uuid) ?? null
    }
    const { data, error } = await db.from('files').select('*').eq('uuid', uuid).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  findBySession: async (sessionId) => {
    if (db._mode === 'sqlite') {
      return db.prepare('SELECT * FROM files WHERE session_id = ? ORDER BY uploaded_at DESC').all(sessionId)
    }
    const { data, error } = await db
      .from('files')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: false })
    if (error) throw error
    return data
  },

  create: async (fileData) => {
    if (db._mode === 'sqlite') {
      const tx = db.transaction((data) => {
        const stmt = db.prepare(`
          INSERT INTO files (uuid, storage_id, session_id, name, type, size, pages, status)
          VALUES (@uuid, @storage_id, @session_id, @name, @type, @size, @pages, 'pending')
        `)
        const result = stmt.run(data)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('file', data.uuid, 'insert', JSON.stringify(data))
        
        return result.lastInsertRowid
      })
      
      const lastId = tx({ pages: null, ...fileData })
      return FileQueries.findById(lastId)
    }
    const { data, error } = await db.from('files').insert({ status: 'pending', ...fileData }).select().single()
    if (error) throw error
    return data
  },

  updateStatus: async (fileId, status) => {
    if (db._mode === 'sqlite') {
      const file = await FileQueries.findById(fileId)
      if (!file) return null

      const tx = db.transaction((data) => {
        db.prepare('UPDATE files SET status = ? WHERE file_id = ?').run(data.status, data.fileId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('file', file.uuid, 'update', JSON.stringify({ status: data.status }))
      })
      
      tx({ fileId, status })
      return FileQueries.findById(fileId)
    }
    const { data, error } = await db.from('files').update({ status }).eq('file_id', fileId).select().single()
    if (error) throw error
    return data
  },

  updatePages: async (fileId, pages) => {
    if (db._mode === 'sqlite') {
      const file = await FileQueries.findById(fileId)
      if (!file) return null

      const tx = db.transaction((data) => {
        db.prepare('UPDATE files SET pages = ?, status = ? WHERE file_id = ?').run(data.pages, 'ready', data.fileId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('file', file.uuid, 'update', JSON.stringify({ pages: data.pages, status: 'ready' }))
      })
      
      tx({ fileId, pages })
      return FileQueries.findById(fileId)
    }
    const { data, error } = await db.from('files').update({ pages, status: 'ready' }).eq('file_id', fileId).select().single()
    if (error) throw error
    return data
  },

  scheduleExpiry: async (fileId, expiryAt) => {
    if (db._mode === 'sqlite') {
      db.prepare('UPDATE files SET expiry_at = ? WHERE file_id = ?').run(expiryAt, fileId)
      return
    }
    const { error } = await db.from('files').update({ expiry_at: expiryAt }).eq('file_id', fileId)
    if (error) throw error
  },

  /** Patch session_id on a file — called from checkout after session is created */
  updateSession: async (fileId, sessionId) => {
    if (db._mode === 'sqlite') {
      const file = await FileQueries.findById(fileId)
      if (!file) return null

      const tx = db.transaction((data) => {
        db.prepare('UPDATE files SET session_id = ? WHERE file_id = ?').run(data.sessionId, data.fileId)
        
        // Atomic outbox write
        db.prepare(`
          INSERT INTO outbox (entity, entity_uuid, operation, payload)
          VALUES (?, ?, ?, ?)
        `).run('file', file.uuid, 'update', JSON.stringify({ session_id: data.sessionId }))
      })
      
      tx({ fileId, sessionId })
      return FileQueries.findById(fileId)
    }
    const { data, error } = await db
      .from('files')
      .update({ session_id: sessionId })
      .eq('file_id', fileId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

module.exports = FileQueries
