import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobStore } from '../../store/job.store'

const Status = () => {
  const { currentJob } = useJobStore()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!currentJob) {
      navigate('/upload')
      return
    }
    
    // Simulate printing progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + 20
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [currentJob, navigate])

  if (!currentJob) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-gray-100">
        
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={progress === 100 ? '#10b981' : '#3b82f6'} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * progress) / 100} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {progress === 100 ? (
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            ) : (
              <span className="text-2xl font-bold text-gray-700">{progress}%</span>
            )}
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
          {progress === 100 ? 'Print Complete!' : 'Printing...'}
        </h2>
        <p className="text-gray-500 mb-8">
          Job {currentJob.id} is {progress === 100 ? 'ready for pickup' : 'being processed by the printer'}.
        </p>

        {progress === 100 && (
          <button 
            onClick={() => navigate('/upload')}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Start New Print
          </button>
        )}
      </div>
    </div>
  )
}

export default Status
