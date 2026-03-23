/**
 * components/ui/Badge.jsx
 * Status badge with color by variant.
 */
import React from 'react'

const variants = {
  // Job statuses
  queued:    'bg-amber-50   text-amber-700  border-amber-200',
  printing:  'bg-blue-50    text-blue-700   border-blue-200',
  done:      'bg-green-50   text-green-700  border-green-200',
  failed:    'bg-red-50     text-red-700    border-red-200',
  cancelled: 'bg-gray-100   text-gray-500   border-gray-200',
  // Payment statuses
  pending:   'bg-amber-50   text-amber-700  border-amber-200',
  success:   'bg-green-50   text-green-700  border-green-200',
  refunded:  'bg-purple-50  text-purple-700 border-purple-200',
  // Generic
  info:      'bg-blue-50    text-blue-600   border-blue-200',
  warning:   'bg-yellow-50  text-yellow-700 border-yellow-200',
  error:     'bg-red-50     text-red-600    border-red-200',
  // Printer
  online:    'bg-green-50   text-green-700  border-green-200',
  offline:   'bg-gray-100   text-gray-500   border-gray-200',
  busy:      'bg-yellow-50  text-yellow-700 border-yellow-200',
}

const dots = {
  queued: 'bg-amber-500', printing: 'bg-blue-500', done: 'bg-green-500',
  failed: 'bg-red-500', cancelled: 'bg-gray-400', pending: 'bg-amber-500',
  success: 'bg-green-500', online: 'bg-green-500', offline: 'bg-gray-400', busy: 'bg-yellow-500',
}

export function Badge({ label, variant = 'info', showDot = true, className = '' }) {
  const style = variants[variant] || variants.info
  const dot   = dots[variant]
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border
      ${style} ${className}
    `}>
      {showDot && dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      )}
      {label ?? variant}
    </span>
  )
}
