/**
 * analytics.queries.js
 * Specialized queries for shop analytics.
 */
const db = require('../index')

const AnalyticsQueries = {

  getOverallStats: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT 
          COUNT(DISTINCT j.job_id) as total_jobs,
          COALESCE(SUM(p.amount), 0) as total_revenue,
          CASE WHEN COUNT(DISTINCT j.job_id) > 0 
               THEN COALESCE(SUM(p.amount), 0) / COUNT(DISTINCT j.job_id) 
               ELSE 0 END as avg_order_value
        FROM print_jobs j
        LEFT JOIN payments p ON p.job_id = j.job_id AND p.status = 'success'
        WHERE j.shop_id = ? AND j.status != 'cancelled'
      `).get(shopId)
    }
    // Supabase: get all successful payments for this shop's jobs
    const { data: payments, error: pe } = await db
      .from('payments')
      .select('amount, print_jobs!inner(shop_id)')
      .eq('print_jobs.shop_id', shopId)
      .eq('status', 'success')

    if (pe) throw pe

    const { data: jobs, error: je } = await db
      .from('print_jobs')
      .select('job_id')
      .eq('shop_id', shopId)
      .neq('status', 'cancelled')

    if (je) throw je

    const total_jobs = jobs.length
    const total_revenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    return {
      total_jobs,
      total_revenue,
      avg_order_value: total_jobs > 0 ? total_revenue / total_jobs : 0
    }
  },

  getTopCustomerByUploads: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT u.name, u.phone, COUNT(f.file_id) as upload_count
        FROM users u
        JOIN sessions s ON s.user_id = u.user_id
        JOIN files f ON f.session_id = s.session_id
        WHERE s.shop_id = ?
        GROUP BY u.user_id
        ORDER BY upload_count DESC
        LIMIT 5
      `).all(shopId)
    }
    const { data, error } = await db
      .from('files')
      .select('sessions!inner(user_id, shop_id, users(name, phone))')
      .eq('sessions.shop_id', shopId)

    if (error) throw error
    const counts = {}
    data.forEach(f => {
      const u = f.sessions?.users
      const uid = f.sessions?.user_id
      if (u && uid) {
        if (!counts[uid]) counts[uid] = { name: u.name, phone: u.phone, upload_count: 0 }
        counts[uid].upload_count++
      }
    })
    return Object.values(counts).sort((a,b) => b.upload_count - a.upload_count).slice(0, 5)
  },

  getTopCustomerBySpending: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT u.name, u.phone, SUM(p.amount) as total_spent
        FROM users u
        JOIN sessions s ON s.user_id = u.user_id
        JOIN print_jobs j ON j.session_id = s.session_id
        JOIN payments p ON p.job_id = j.job_id
        WHERE j.shop_id = ? AND p.status = 'success'
        GROUP BY u.user_id
        ORDER BY total_spent DESC
        LIMIT 5
      `).all(shopId)
    }
    const { data, error } = await db
      .from('payments')
      .select('amount, print_jobs!inner(shop_id, sessions!inner(user_id, users(name, phone)))')
      .eq('print_jobs.shop_id', shopId)
      .eq('status', 'success')

    if (error) throw error
    const spending = {}
    data.forEach(p => {
      const u = p.print_jobs?.sessions?.users
      const uid = p.print_jobs?.sessions?.user_id
      if (u && uid) {
        if (!spending[uid]) spending[uid] = { name: u.name, phone: u.phone, total_spent: 0 }
        spending[uid].total_spent += parseFloat(p.amount || 0)
      }
    })
    return Object.values(spending).sort((a,b) => b.total_spent - a.total_spent).slice(0, 5)
  },

  getMostRevenueDay: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT DATE(p.paid_at) as date, SUM(p.amount) as revenue
        FROM payments p
        JOIN print_jobs j ON j.job_id = p.job_id
        WHERE j.shop_id = ? AND p.status = 'success' AND p.paid_at IS NOT NULL
        GROUP BY date
        ORDER BY revenue DESC
        LIMIT 1
      `).get(shopId)
    }
    const { data, error } = await db
      .from('payments')
      .select('amount, paid_at, print_jobs!inner(shop_id)')
      .eq('print_jobs.shop_id', shopId)
      .eq('status', 'success')
      .not('paid_at', 'is', null)

    if (error) throw error
    const daily = {}
    data.forEach(p => {
      const date = p.paid_at.split('T')[0]
      daily[date] = (daily[date] || 0) + parseFloat(p.amount || 0)
    })
    const sorted = Object.entries(daily).sort((a,b) => b[1] - a[1])
    return sorted.length > 0 ? { date: sorted[0][0], revenue: sorted[0][1] } : null
  },

  getRevenueByMethod: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT p.method, SUM(p.amount) as revenue
        FROM payments p
        JOIN print_jobs j ON j.job_id = p.job_id
        WHERE j.shop_id = ? AND p.status = 'success'
        GROUP BY p.method
      `).all(shopId)
    }
    const { data, error } = await db
      .from('payments')
      .select('amount, method, print_jobs!inner(shop_id)')
      .eq('print_jobs.shop_id', shopId)
      .eq('status', 'success')

    if (error) throw error
    const methods = {}
    data.forEach(p => {
      methods[p.method] = (methods[p.method] || 0) + parseFloat(p.amount || 0)
    })
    return Object.entries(methods).map(([method, revenue]) => ({ method, revenue }))
  },

  getJobStatusBreakdown: async (shopId) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT status, COUNT(*) as count
        FROM print_jobs
        WHERE shop_id = ?
        GROUP BY status
      `).all(shopId)
    }
    const { data, error } = await db
      .from('print_jobs')
      .select('status')
      .eq('shop_id', shopId)
    
    if (error) throw error
    const stats = {}
    data.forEach(j => {
      stats[j.status] = (stats[j.status] || 0) + 1
    })
    return Object.entries(stats).map(([status, count]) => ({ status, count }))
  },

  getDailyRevenueTrend: async (shopId, days = 30) => {
    if (db._mode === 'sqlite') {
      return db.prepare(`
        SELECT DATE(p.paid_at) as date, SUM(p.amount) as revenue
        FROM payments p
        JOIN print_jobs j ON j.job_id = p.job_id
        WHERE j.shop_id = ? AND p.status = 'success' AND p.paid_at >= DATE('now', ?)
        GROUP BY date
        ORDER BY date ASC
      `).all(shopId, `-${days} days`)
    }
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const { data, error } = await db
      .from('payments')
      .select('amount, paid_at, print_jobs!inner(shop_id)')
      .eq('print_jobs.shop_id', shopId)
      .eq('status', 'success')
      .gte('paid_at', cutoff.toISOString())

    if (error) throw error
    const timeline = {}
    data.forEach(p => {
      const date = p.paid_at.split('T')[0]
      timeline[date] = (timeline[date] || 0) + parseFloat(p.amount || 0)
    })
    return Object.entries(timeline)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a,b) => a.date.localeCompare(b.date))
  }
}

module.exports = AnalyticsQueries
