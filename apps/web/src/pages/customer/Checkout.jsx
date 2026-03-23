import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobStore } from '../../store/job.store'
import api from '../../services/api'

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const Checkout = () => {
  const { files, updateFileSettings, setCurrentJob, clearFiles, selectedShop, setSelectedShop } = useJobStore()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [shops, setShops] = useState([])
  const [pricingRules, setPricingRules] = useState([])

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await api.get('/shops')
        setShops(res.data.data || [])
        if (res.data.data?.length > 0 && !selectedShop) {
          setSelectedShop(res.data.data[0].shop_id.toString())
        }
      } catch (err) {
        console.error('Failed to load shops:', err)
      }
    }
    fetchShops()
  }, [])

  useEffect(() => {
    if (!selectedShop) return
    api.get(`/pricing/shop/${selectedShop}`)
      .then(res => setPricingRules(res.data.data || []))
      .catch(err => console.error('Pricing fetch failed', err))
  }, [selectedShop])

  // Helper to get price for a specific file setup
  const getPrice = (colorMode, paperSize) => {
    const rule = pricingRules.find(r => r.color_type === colorMode && r.paper_size === paperSize)
    return rule ? parseFloat(rule.price_per_page) : (colorMode === 'color' ? 10 : 2)
  }

  const subtotal = files.reduce((acc, item) => {
    const price = getPrice(item.settings.color_mode, item.settings.paper_size)
    return acc + (price * item.settings.copies)
  }, 0)
  
  const gst = subtotal * 0.18
  const totalAmount = subtotal + gst

  const handlePayment = async () => {
    if (!selectedShop) return alert("Please select a print shop first.")
    setLoading(true)
    
    try {
      const isLoaded = await loadRazorpay()
      if (!isLoaded) throw new Error('Razorpay SDK failed to load')

      // 0. Create Session
      let sessionId = null
      try {
        const storedUserId = localStorage.getItem('printeasy_user_id')
        const { data: sessionRes } = await api.post('/sessions', {
          shop_id: parseInt(selectedShop),
          is_local: false,
          user_id: storedUserId ? parseInt(storedUserId) : undefined
        })
        sessionId = sessionRes.data?.session_id
      } catch (err) {
        console.warn('Silent fallback: Could not establish a session record', err)
      }

      // 1. Create Batch Print Jobs
      const storedUserId = localStorage.getItem('printeasy_user_id')
      const jobsPayload = files.map(item => ({
        file_id: item.file.id,
        printer_id: 1, 
        shop_id: parseInt(selectedShop),
        session_id: sessionId,
        origin: 'online',
        user_id: storedUserId ? parseInt(storedUserId) : undefined,
        ...item.settings
      }))

      const { data: batchRes } = await api.post('/jobs/batch', { jobs: jobsPayload })
      const { jobs, total_cost, payment_group_id } = batchRes.data

      // 2. Create Razorpay Order
      // Using the FIRST job of the batch to link the payment order for now
      // Backend will use the payment_group_id to link all of them
      const { data: orderRes } = await api.post('/payments/create-order', {
        job_id: jobs[0].job_id,
        amount: total_cost, 
        method: 'upi',
        payment_group_id: payment_group_id
      })
      const { razorpayOrder } = orderRes.data

      // 3. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RmJsnt3vf5WCir',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'PrintEasy Platform',
        description: `Batch Payment for ${files.length} items at ${shops.find(s => s.shop_id.toString() === selectedShop)?.shop_name}`,
        order_id: razorpayOrder.id,
        handler: async function (response) {
          // 4. Verify Payment
          await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })

          if (sessionId) {
            try { await api.patch(`/sessions/${sessionId}/end`) } catch (e) { /* soft fail */ }
          }

          setCurrentJob(jobs[0]) // Show first job status for now or update status.jsx to handle multiple
          clearFiles()
          navigate('/status')
        },
        prefill: {
          name: 'Online Customer',
          email: 'customer@printeasy.com',
          contact: '9999999999'
        },
        theme: {
          color: '#2563eb'
        }
      }
      
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', response => alert('Payment Failed: ' + response.error.description))
      rzp.open()
      
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message || 'Payment initiation failed')
    } finally {
      setLoading(false)
    }
  }

  if (files.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No files to checkout</h2>
          <button onClick={() => navigate('/upload')} className="text-blue-600 hover:underline">Go back to Upload</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-12">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: List of Files with Settings */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-7 h-7 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Set Print Requirements
            </h2>
            <p className="text-gray-500 mb-8">Configure each document individually for the best results.</p>
            
            <div className="space-y-8">
              {files.map((item) => (
                <div key={item.id} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/80">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 truncate max-w-[200px] sm:max-w-md">{item.file.name}</h3>
                        <p className="text-sm text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Color Mode */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Color Mode</label>
                      <select 
                        value={item.settings.color_mode}
                        onChange={(e) => updateFileSettings(item.id, { color_mode: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                      >
                        <option value="bw">Black & White (₹{getPrice('bw', item.settings.paper_size)})</option>
                        <option value="color">Full Color (₹{getPrice('color', item.settings.paper_size)})</option>
                      </select>
                    </div>

                    {/* Paper Size */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paper Size</label>
                      <select 
                        value={item.settings.paper_size}
                        onChange={(e) => updateFileSettings(item.id, { paper_size: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                      >
                        <option value="A4">A4 Standard</option>
                        <option value="A3">A3 Large</option>
                      </select>
                    </div>

                    {/* Copies */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Copies</label>
                      <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
                        <button 
                          onClick={() => updateFileSettings(item.id, { copies: Math.max(1, item.settings.copies - 1) })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold text-gray-800 w-8 text-center">{item.settings.copies}</span>
                        <button 
                          onClick={() => updateFileSettings(item.id, { copies: item.settings.copies + 1 })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 sticky top-12">
            <div className="bg-blue-600 p-8 text-white">
              <h2 className="text-2xl font-bold mb-1">Pick up Details</h2>
              <p className="text-blue-100 text-sm">Select your preferred print shop</p>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <select 
                  value={selectedShop || ""} 
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium mb-2"
                >
                  <option value="" disabled>Choose a shop...</option>
                  {shops.map(shop => (
                    <option key={shop.shop_id} value={shop.shop_id}>{shop.shop_name} • {shop.status}</option>
                  ))}
                </select>
                <div className="flex items-center text-xs text-gray-400 mt-2 px-1">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Your document will be ready at this location
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-2xl p-6 mb-8 space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700 font-medium capitalize">
                    <span>Subtotal ({files.length} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>GST (18%)</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Price</span>
                    <span className="text-2xl font-black text-blue-600">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={loading || !selectedShop}
                className={`w-full py-5 rounded-2xl font-bold text-lg text-white transition-all transform active:scale-[0.98] ${loading || !selectedShop ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30'}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : 'Confirm and Pay'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Checkout
