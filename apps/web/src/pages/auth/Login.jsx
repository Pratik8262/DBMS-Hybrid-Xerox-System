import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import api from '../../services/api'

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shopId = searchParams.get('shopId')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer'
  })

  // Ensure a persistent device_id for this browser session
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('printeasy_device_id')
    if (!deviceId) {
      deviceId = 'device-' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('printeasy_device_id', deviceId)
    }
    return deviceId
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (!formData.email && !formData.phone) {
      setLoading(false)
      alert('Please provide either an email address or phone number.')
      return
    }

    try {
      const device_id = getDeviceId()
      const { setAuth } = useAuthStore.getState()
      
      let res = null
      
      if (isLogin) {
        res = await api.post('/auth/login', { 
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          device_id 
        })
      } else {
        const payload = {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          device_id,
          role: formData.role
        }
        res = await api.post('/auth/register', payload)
      }

      const userData = res?.data?.data?.user
      const token = res?.data?.data?.token

      if (token) {
        setAuth({ 
          user: userData, 
          token, 
          role: userData?.role || formData.role 
        })
        
        // Demo helper for shop lookup
        if (userData?.email) {
          localStorage.setItem('printeasy_owner_email', userData.email)
        }
      }

      // Navigate based on role selection
      if (formData.role === 'shopkeeper') {
        navigate('/shopkeeper')
      } else {
        const redirectParams = shopId ? `?shopId=${shopId}` : ''
        navigate('/upload' + redirectParams)
      }
    } catch (error) {
      console.error('Auth error', error)
      alert(error.response?.data?.error?.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">PrintEasy</h1>
          <p className="text-blue-100">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'customer'})}
                  className={`py-2 rounded-xl border text-sm font-medium transition-colors ${formData.role === 'customer' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'shopkeeper'})}
                  className={`py-2 rounded-xl border text-sm font-medium transition-colors ${formData.role === 'shopkeeper' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  Shopkeeper
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="John Doe" 
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="you@email.com" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="+91 9876543210" 
              />
            </div>

            <button disabled={loading} type="submit" className={`w-full text-white font-bold py-3 rounded-xl transition-colors ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold ml-1 hover:underline">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
