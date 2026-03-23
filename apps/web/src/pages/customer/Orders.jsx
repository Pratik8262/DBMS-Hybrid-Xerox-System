import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const Orders = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/jobs/user/me')
        setJobs(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch orders', err)
        if (err.response?.status === 401) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [navigate])

  const getStatusBadge = (status) => {
    switch(status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800'
      case 'printing': return 'bg-blue-100 text-blue-800'
      case 'done': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 sm:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">My Print Orders</h1>
          <button 
            onClick={() => navigate('/upload')} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm"
          >
            + New Print Job
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-200 shadow-sm mt-8">
            <h3 className="text-xl font-bold text-gray-700 mb-2">No past orders found</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't printed anything yet.</p>
            <button onClick={() => navigate('/upload')} className="text-blue-600 font-bold hover:underline">Start Printing Now</button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.job_id} className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800">Order #{job.job_id.toString().padStart(4, '0')}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${getStatusBadge(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">₹{parseFloat(job.cost || 0).toFixed(2)}</p>
                  </div>
                </div>
                
                <hr className="border-gray-50 my-4" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 text-sm">
                  <div>
                    <span className="block text-gray-400 font-semibold text-xs uppercase mb-1">Shop</span>
                    <span className="text-gray-800 font-medium">{job.shop_name || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold text-xs uppercase mb-1">Date</span>
                    <span className="text-gray-800 font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold text-xs uppercase mb-1">Document</span>
                    <span className="text-gray-800 font-medium truncate inline-block max-w-[150px]" title={job.file_name}>{job.file_name}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold text-xs uppercase mb-1">Details</span>
                    <span className="text-gray-800 font-medium">{job.pages} Pages</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders
