/**
 * pages/offline/OfflineUpload.jsx
 * Served by the local server when customer connects via shop hotspot.
 * Uploads directly to local SQLite → outbox → syncs later.
 */
import React, { useState } from 'react'
import api from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Select, Input } from '../../components/ui/Input'
import { PrintSettingsForm, defaultPrintSettings } from '../../components/shared/PrintSettingsForm'
import { Spinner } from '../../components/ui/Spinner'

export default function OfflineUpload() {
  const [step, setStep]       = useState('upload')   // upload | settings | done | error
  const [file, setFile]       = useState(null)
  const [fileId, setFileId]   = useState(null)
  const [settings, setSettings] = useState(defaultPrintSettings)
  const [loading, setLoading] = useState(false)
  const [job, setJob]         = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  const sessionId = localStorage.getItem('offline_session_id')

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const uploadFile = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('document', file)
      if (sessionId) fd.append('session_id', sessionId)

      const res = await api.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFileId(res.data.data.file_id)
      setStep('settings')
    } catch (e) {
      setErrMsg(e.response?.data?.error?.message || 'Upload failed. Check connection.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const submitJob = async () => {
    if (!fileId) return
    setLoading(true)
    try {
      const shopId = localStorage.getItem('printeasy_shop_id') || 1
      const res = await api.post('/jobs', {
        file_id:    fileId,
        session_id: Number(sessionId),
        shop_id:    Number(shopId),
        settings,
        origin:     'offline',
      })
      setJob(res.data.data)
      setStep('done')
    } catch (e) {
      setErrMsg(e.response?.data?.error?.message || 'Failed to queue print job.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  // ── Upload step ──────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <h1 className="text-2xl font-black text-gray-800 mb-1">Offline Print 🖨️</h1>
        <p className="text-gray-400 text-sm mb-6">Upload your document to print at this shop.</p>

        <label className="block w-full h-40 border-2 border-dashed border-blue-200 rounded-2xl hover:border-blue-400 transition-colors cursor-pointer bg-blue-50/50 flex flex-col items-center justify-center gap-2 text-center p-4">
          <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.txt" onChange={handleFileChange} className="hidden" />
          {file ? (
            <>
              <span className="text-4xl">📄</span>
              <p className="font-semibold text-gray-700 text-sm truncate max-w-full">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <span className="text-4xl">⬆️</span>
              <p className="text-sm font-medium text-blue-600">Tap to select file</p>
              <p className="text-xs text-gray-400">PDF, DOCX, JPG, PNG, TXT · Max 50MB</p>
            </>
          )}
        </label>

        <Button className="w-full mt-6" size="lg" disabled={!file} loading={loading} onClick={uploadFile}>
          Upload & Continue
        </Button>
      </div>
    </div>
  )

  // ── Settings step ────────────────────────────────────────────────────────────
  if (step === 'settings') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-xl font-black text-gray-800 mb-1">Print Settings</h2>
        <p className="text-gray-400 text-sm mb-6">Customise before printing</p>

        <PrintSettingsForm settings={settings} onChange={setSettings} />

        <Button className="w-full mt-6" size="lg" loading={loading} onClick={submitJob}>
          🖨️ Print Now
        </Button>
      </div>
    </div>
  )

  // ── Done step ────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-7xl mb-4">🎉</div>
        <h1 className="text-2xl font-black mb-2">Print Job Queued!</h1>
        <p className="text-green-100 mb-2">Your document has been sent to the printer.</p>
        {job?.uuid && (
          <p className="text-xs text-green-200 font-mono mt-4">Job #{job.uuid.slice(0, 8)}</p>
        )}
        <p className="text-xs text-green-200 mt-6 opacity-70">
          Queue position: {job?.queue_position ?? '—'} · Cost: ₹{job?.cost ?? '—'}
        </p>
      </div>
    </div>
  )

  // ── Error step ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-6">{errMsg}</p>
        <Button onClick={() => { setStep('upload'); setFile(null); setErrMsg('') }}>
          Try Again
        </Button>
      </div>
    </div>
  )
}
