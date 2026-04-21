/**
 * Restore incorrectly cancelled jobs — run once
 */
const Database = require('better-sqlite3')
const path = require('path')
const db = new Database(path.join(__dirname, 'printeasy.db'))

// Show current job statuses
const stats = db.prepare(`
  SELECT status, COUNT(*) as count FROM print_jobs GROUP BY status
`).all()
console.log('Current job status counts:', stats)

// Restore all cancelled jobs that were created recently (past 7 days)
// and were likely cancelled by the buggy cleanup worker
const restored = db.prepare(`
  UPDATE print_jobs 
  SET status = 'queued', updated_at = datetime('now')
  WHERE status = 'cancelled'
    AND created_at >= datetime('now', '-7 days')
`).run()
console.log(`Restored ${restored.changes} jobs to 'queued'`)

// Show after
const after = db.prepare(`
  SELECT status, COUNT(*) as count FROM print_jobs GROUP BY status
`).all()
console.log('After restore:', after)

db.close()
