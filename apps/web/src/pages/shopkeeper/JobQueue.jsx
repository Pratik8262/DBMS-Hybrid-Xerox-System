import React, { useState, useEffect } from 'react'
import api from '../../services/api'

const STATUS_CONFIG = {
  queued:    { label: 'Queued',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  printing:  { label: 'Printing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  done:      { label: 'Done',     color: 'bg-green-100 text-green-800 border-green-200' },
  failed:    { label: 'Failed',   color: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelled',color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const FILTER_OPTIONS = [
  { value: 'all',      label: '📋 All Jobs' },
  { value: 'queued',   label: '⏳ Queued' },
  { value: 'printing', label: '🖨️ Printing' },
  { value: 'done',     label: '✅ Done' },
  { value: 'cancelled',label: '🚫 Cancelled' },
]

/**
 * JobQueue.jsx
 * Dedicated shopkeeper page to view and manage all print jobs.
 * Auto-refreshes every 5 seconds while active jobs exist.
 */
const JobQueue = ({ shopId }) => {
  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [error, setError]         = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchJobs = async () => {
    if (!shopId) return
    try {
      const res = await api.get(`/jobs/shop/${shopId}`)
      setJobs(res.data.data || [])
      setError(null)
    } catch (err) {
      setError('Failed to load jobs. Retrying...')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [shopId])

  const updateStatus = async (jobId, newStatus) => {
    setUpdatingId(jobId)
    try {
      // Optimistic UI update
      setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status: newStatus } : j))
      await api.patch(`/jobs/${jobId}/status`, { status: newStatus })
    } catch (err) {
      fetchJobs() // Revert on failure
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = jobs.filter(job => {
    const matchesFilter = filter === 'all' || job.status === filter
    const matchesSearch = !search || String(job.job_id).includes(search)
    return matchesFilter && matchesSearch
  })

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s).length
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Queued',   value: counts.queued,   color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Printing', value: counts.printing, color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Done',     value: counts.done,     color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Cancelled',value: counts.cancelled,color: 'text-gray-500',   bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by Job ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === opt.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchJobs}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-gray-200 shadow-sm">
          <p className="text-4xl mb-4">📭</p>
          <h3 className="text-xl font-bold text-gray-700 mb-1">No Jobs Found</h3>
          <p className="text-gray-400 text-sm">
            {filter !== 'all' ? `No ${filter} jobs right now.` : 'Your queue is empty — great work!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued
            const isUpdating = updatingId === job.job_id
            return (
              <div
                key={job.job_id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Job info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-black text-gray-800">
                      Job #{String(job.job_id).padStart(4, '0')}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md uppercase">
                      {job.origin}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-500">
                    <span><span className="font-semibold text-gray-400">Time:</span> {new Date(job.created_at).toLocaleTimeString()}</span>
                    <span><span className="font-semibold text-gray-400">File:</span> {job.file_id}</span>
                    <span><span className="font-semibold text-gray-400">Cost:</span> <strong className="text-gray-700">₹{parseFloat(job.cost || 0).toFixed(2)}</strong></span>
                    {job.priority && <span><span className="font-semibold text-gray-400">Priority:</span> {job.priority}/10</span>}
                    {job.queue_position && <span><span className="font-semibold text-gray-400">Queue #:</span> {job.queue_position}</span>}
                  </div>
                </div>

                {/* Right: Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {job.status === 'queued' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(job.job_id, 'printing')}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                    >
                      {isUpdating ? '...' : '🖨️ Start'}
                    </button>
                  )}
                  {job.status === 'printing' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(job.job_id, 'done')}
                      className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                    >
                      {isUpdating ? '...' : '✅ Done'}
                    </button>
                  )}
                  {['queued', 'printing'].includes(job.status) && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(job.job_id, 'cancelled')}
                      className="bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-gray-600 font-bold py-2.5 px-4 rounded-xl border border-gray-200 hover:border-red-200 transition-all active:scale-95 text-sm"
                    >
                      ✕
                    </button>
                  )}
                  {['done', 'failed', 'cancelled'].includes(job.status) && (
                    <span className="text-gray-300 text-sm font-medium py-2.5 px-4">No actions</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-300 pt-2">
        Auto-refreshing every 5 seconds · {filtered.length} of {jobs.length} jobs shown
      </p>
    </div>
  )
}

export default JobQueue
