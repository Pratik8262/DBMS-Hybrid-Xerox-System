/**
 * components/shared/JobCard.jsx
 * Card showing summary info for a single print job.
 */
import React from 'react'
import { JobStatusBadge } from './JobStatusBadge'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export function JobCard({ job, onClick }) {
  if (!job) return null
  const { status, file_name, pages, copies, color_mode, paper_size, cost, created_at, uuid } = job

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-gray-100 shadow-sm p-5
        hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer
        group
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* File icon */}
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            📄
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">
              {file_name ?? 'Document'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pages} page{pages !== 1 ? 's' : ''} · {copies}x · {color_mode?.toUpperCase()} · {paper_size}
            </p>
          </div>
        </div>
        <JobStatusBadge status={status} />
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <p className="text-xs text-gray-400">{formatDate(created_at)}</p>
        {cost != null && (
          <p className="text-sm font-bold text-gray-700">₹{Number(cost).toFixed(2)}</p>
        )}
      </div>

      {uuid && (
        <p className="text-[10px] text-gray-300 mt-1 font-mono truncate">#{uuid.slice(0, 8)}</p>
      )}
    </div>
  )
}
