/**
 * components/shared/JobStatusBadge.jsx
 * Convenience wrapper around Badge for print job status labels.
 */
import React from 'react'
import { Badge } from '../ui/Badge'

const labels = {
  queued:    '🕐 Queued',
  printing:  '🖨️ Printing',
  done:      '✅ Done',
  failed:    '❌ Failed',
  cancelled: '🚫 Cancelled',
}

export function JobStatusBadge({ status }) {
  return <Badge variant={status} label={labels[status] ?? status} />
}
