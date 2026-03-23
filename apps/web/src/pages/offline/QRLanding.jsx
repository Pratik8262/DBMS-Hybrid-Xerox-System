import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { Spinner } from '../../components/ui/Spinner'

export default function QRLanding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [status, setStatus] = useState('checking') // checking | valid | invalid

  useEffect(() => {
    const token = params.get('token')
    const apiPort = params.get('api_port')
    
    if (apiPort) {
      localStorage.setItem('printeasy_api_port', apiPort)
      // We need to reload or force api.js to re-evaluate if we want the FIRST call to hit the new port.
      // But actually, we can just call the specific URL for this one bootup call.
    }

    if (!token) {
      setStatus('invalid')
      return
    }

    const targetUrl = apiPort ? `http://${window.location.hostname}:${apiPort}/api/qr/consume` : '/api/qr/consume'

    // Call the new API endpoint to safely consume the QR code!
    api.post(targetUrl, { token })
      .then((res) => {
        const { session_id, shop_id } = res.data.data
        localStorage.setItem('offline_session_id', session_id)
        localStorage.setItem('printeasy_shop_id', shop_id)
        setStatus('valid')
        setTimeout(() => window.location.href = '/offline/upload', 1500) // Force reload to pick up new API port
      })
      .catch((err) => {
        console.error('QR code verification failed:', err)
        setStatus('invalid')
      })
  }, [navigate, params])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <Spinner size="xl" color="border-white" className="mx-auto mb-6" />
          <p className="text-lg font-semibold">Verifying your QR code...</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">🚫</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">QR Code Invalid</h1>
          <p className="text-gray-500 mb-6">
            This QR code has expired or already been used.<br/>
            Ask the shopkeeper to generate a new one.
          </p>
          <p className="text-xs text-gray-300">PrintEasy Local Server</p>
          <button onClick={() => navigate('/login')} className="mt-8 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition">Back to Login</button>
        </div>
      </div>
    )
  }

  // status === 'valid'
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-7xl mb-4">✅</div>
        <h1 className="text-2xl font-black mb-2">Connected!</h1>
        <p className="text-green-100 mb-6">Redirecting to shop upload page...</p>
        <Spinner size="md" color="border-white" className="mx-auto" />
      </div>
    </div>
  )
}
