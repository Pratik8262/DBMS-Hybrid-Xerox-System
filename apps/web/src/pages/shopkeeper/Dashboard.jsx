import React, { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const StatCard = ({ label, value, sub, accent = '#6366f1' }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm" style={{ borderLeft: `4px solid ${accent}` }}>
      <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const Dashboard = () => {
  const [myShop, setMyShop] = useState(null)
  const [jobs, setJobs] = useState([])

  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shopForm, setShopForm] = useState({ shop_name: '', contact: '', address: '', area: '', city: '', pincode: '' })

  const { user } = useAuthStore()
  // Use Zustand auth store as the authoritative email source;
  // fall back to localStorage for backwards compatibility
  const ownerEmail = user?.email || localStorage.getItem('printeasy_owner_email')

  const [activeTab, setActiveTab] = useState('overview')
  const [pricingRules, setPricingRules] = useState([])
  const [pricingForm, setPricingForm] = useState({ color_type: 'bw', paper_size: 'A4', price_per_page: '' })
  const [isAddingPricing, setIsAddingPricing] = useState(false)

  const [networks, setNetworks] = useState([])
  const [networkConfig, setNetworkConfig] = useState({
    ssid: '',
    auth_type: 'WPA2',
    credential_ref: '',
    is_primary: true
  })

  const [shopProfileForm, setShopProfileForm] = useState({
    shop_name: '',
    email: '',
    contact: '',
    address: '',
    area: '',
    city: '',
    pincode: ''
  })
  const [isSavingNetwork, setIsSavingNetwork] = useState(false)
  const [serverNetInfo, setServerNetInfo] = useState({ localIp: 'localhost', port: 3000 })
  const [isUpdatingShopProfile, setIsUpdatingShopProfile] = useState(false)
  
  const [offlineQrUrl, setOfflineQrUrl] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)

  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  const generateOfflineQr = async () => {
    setIsGeneratingQr(true)
    try {
      const res = await api.post('/qr/generate')
      if (res.data.success && res.data.data && res.data.data.url) {
        setOfflineQrUrl(res.data.data.url)
      }
    } catch (e) {
      console.error('Failed to generate offline QR', e)
    } finally {
      setIsGeneratingQr(false)
    }
  }

  useEffect(() => {
    if ((activeTab === 'network' || activeTab === 'overview') && myShop) {
      generateOfflineQr()
      // Refresh every 9 mins before 10 min TTL expires
      const interval = setInterval(generateOfflineQr, 9 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [activeTab, myShop])

  useEffect(() => {
    const checkOwningShop = async () => {
      try {
        // Use the authenticated /shops/mine endpoint — avoids fragile email-matching
        const res = await api.get('/shops/mine')
        const shop = res.data.data
        if (shop) {
          setMyShop(shop)
        } else {
          setLoading(false)
        }
      } catch (err) {
        // 404 means no shop found — prompt to register
        setLoading(false)
      }
    }
    checkOwningShop()
  }, [])

  const handleRegisterShop = async (e) => {
    e.preventDefault()
    setIsRegistering(true)
    try {
      const res = await api.post('/shops', { uuid: crypto.randomUUID(), email: ownerEmail, ...shopForm })
      setMyShop(res.data.data)
    } catch (err) {
      alert("Registration failed.")
    } finally {
      setIsRegistering(false)
    }
  }

  const fetchData = async () => {
    if (!myShop) return
    try {
      if (activeTab === 'queue' || activeTab === 'overview') {
        const res = await api.get(`/jobs/shop/${myShop.shop_id}`)
        setJobs(res.data.data || [])
      }
      if (activeTab === 'pricing') {
        const res = await api.get(`/pricing/shop/${myShop.shop_id}`)
        setPricingRules(res.data.data || [])
      }
      if (activeTab === 'network' || activeTab === 'overview') {
        const [resNet, resInfo] = await Promise.all([
          api.get(`/networks/shop/${myShop.shop_id}`),
          api.get('/qr/info')
        ])
        setNetworks(resNet.data.data || [])
        setServerNetInfo(resInfo.data.data || { localIp: 'localhost', port: 3000 })
      }
      if (activeTab === 'profile') {
        fetchShopDetails()
      }
      if (activeTab === 'analytics') {
        fetchAnalytics()
      }
    } catch (err) {
      console.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!myShop) return
    setLoadingAnalytics(true)
    setAnalyticsError(null)
    try {
      const res = await api.get(`/analytics/shop/${myShop.shop_id}`)
      setAnalyticsData(res.data.data)
    } catch (err) {
      console.error('Failed to fetch analytics', err)
      setAnalyticsError(err.response?.data?.error?.message || 'Access Denied: You do not have permission to view analytics for this shop.')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (myShop && myShop.shop_id) {
      setLoading(true)
      fetchData()
      let interval = null
      if (activeTab === 'queue' || activeTab === 'overview') {
        interval = setInterval(fetchData, 5000)
      }
      return () => { if (interval) clearInterval(interval) }
    }
  }, [myShop, activeTab])

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      setJobs(jobs.map(j => j.job_id === jobId ? { ...j, status: newStatus } : j))
      await api.patch(`/jobs/${jobId}/status`, { status: newStatus })
    } catch (err) {
      fetchData()
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'printing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleAddPricing = async (e) => {
    e.preventDefault()
    setIsAddingPricing(true)
    try {
      await api.post('/pricing', { shop_id: myShop.shop_id, ...pricingForm })
      fetchData()
      setPricingForm({ ...pricingForm, price_per_page: '' })
    } catch (err) {
      alert("Failed to add pricing rule. Make sure it doesn't already exist.")
    } finally {
      setIsAddingPricing(false)
    }
  }

  const handleSaveNetwork = async (e) => {
    e.preventDefault()
    setIsSavingNetwork(true)
    try {
      if (networks.length > 0) {
        await api.patch(`/networks/${networks[0].network_id}`, networkConfig)
      } else {
        await api.post('/networks', { shop_id: myShop.shop_id, ...networkConfig })
      }
      fetchData()
      alert("Network settings saved!")
    } catch (err) {
      alert("Failed to save network settings.")
    } finally {
      setIsSavingNetwork(false)
    }
  }

  useEffect(() => {
    if (networks.length > 0) {
      const net = networks.find(n => n.is_primary) || networks[0]
      setNetworkConfig({
        ssid: net.ssid,
        auth_type: net.auth_type,
        credential_ref: net.credential_ref,
        is_primary: net.is_primary == 1 || net.is_primary === true
      })
    }
  }, [networks])

  const today = new Date().toDateString()
  const todaysJobs = useMemo(() => jobs.filter(j => new Date(j.created_at).toDateString() === today), [jobs])
  const todaysRevenue = useMemo(() => todaysJobs.reduce((sum, j) => sum + parseFloat(j.cost || 0), 0), [todaysJobs])
  const todaysPending = useMemo(() => todaysJobs.filter(j => j.status === 'queued').length, [todaysJobs])
  const todaysPrinted = useMemo(() => todaysJobs.filter(j => j.status === 'done').length, [todaysJobs])
  const todaysPrinting = useMemo(() => todaysJobs.filter(j => j.status === 'printing').length, [todaysJobs])
  const todaysCancelled = useMemo(() => todaysJobs.filter(j => j.status === 'cancelled').length, [todaysJobs])

  useEffect(() => {
    if (myShop?.shop_id && activeTab === 'profile') {
      fetchShopDetails()
    }
  }, [myShop, activeTab])

  const fetchShopDetails = async () => {
    try {
      if (!myShop?.shop_id) return
      const res = await api.get(`/shops/${myShop.shop_id}`)
      const shop = res.data.data
      setShopProfileForm({
        shop_name: shop.shop_name || '',
        email: shop.email || '',
        contact: shop.contact || '',
        address: shop.address || '',
        area: shop.area || '',
        city: shop.city || '',
        pincode: shop.pincode || ''
      })
    } catch (err) {
      console.error('Failed to fetch shop details', err)
    }
  }

  if (loading && !myShop) {
    return <div className="min-h-screen bg-gray-50 flex justify-center p-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
  }

  if (!myShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <h1 className="text-3xl font-black mb-2">Register Your Shop</h1>
            <p className="text-indigo-100">Set up your print shop profile to start receiving orders instantly.</p>
          </div>
          <form onSubmit={handleRegisterShop} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Name</label>
                <input required value={shopForm.shop_name} onChange={e => setShopForm({...shopForm, shop_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Central Campus Printers" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Phone</label>
                <input required value={shopForm.contact} onChange={e => setShopForm({...shopForm, contact: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+91 9999999999" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input required value={shopForm.city} onChange={e => setShopForm({...shopForm, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Pune" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                <input required value={shopForm.pincode} onChange={e => setShopForm({...shopForm, pincode: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="411044" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Local Branch / Area</label>
                <input value={shopForm.area} onChange={e => setShopForm({...shopForm, area: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Akurdi" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Address</label>
                <textarea required value={shopForm.address} onChange={e => setShopForm({...shopForm, address: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" placeholder="Unit 4, Tech Park..."></textarea>
              </div>
            </div>
            <button disabled={isRegistering} type="submit" className={`w-full text-white font-bold py-4 rounded-xl transition-transform transform ${isRegistering ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 shadow-lg'}`}>
              {isRegistering ? 'Creating Shop...' : 'Create My Print Shop'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const primaryNetwork = networks.find(n => n.is_primary) || networks[0]
  const ssid = primaryNetwork?.ssid || `PrintEasy-${(myShop?.shop_name || 'Shop').replace(/\s+/g, '')}`
  const pass = primaryNetwork?.credential_ref || 'connect123'
  const encryption = primaryNetwork?.auth_type || 'WPA'

  const qrDataString = `WIFI:T:${encryption};S:${ssid};P:${pass};;`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataString)}`

  const uploadQrUrl = offlineQrUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(offlineQrUrl)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Loading...`
  
  const displayUrl = offlineQrUrl || 'Generating secure token...'

  const navItems = [
    { id: 'overview', icon: '🏠', label: 'Dashboard' },
    { id: 'queue', icon: '📄', label: 'Print Queue' },
    { id: 'pricing', icon: '💰', label: 'Pricing Settings' },
    { id: 'network', icon: '🌐', label: 'Network Settings' },
    { id: 'analytics', icon: '📊', label: 'Shop Analytics' },
    { id: 'profile', icon: '🏪', label: 'Shop Profile' },
  ]

  const handleSaveShopProfile = async (e) => {
    e.preventDefault()
    setIsUpdatingShopProfile(true)
    try {
      await api.patch(`/shops/${myShop.shop_id}`, shopProfileForm)
      alert('Shop profile updated successfully!')
      fetchShopDetails()
    } catch (err) {
      console.error('Failed to update shop profile', err)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsUpdatingShopProfile(false)
    }
  }

  const toggleShopStatus = async () => {
    if (!myShop) return
    const newStatus = myShop.status === 'active' ? 'inactive' : 'active'
    setIsTogglingStatus(true)
    try {
      await api.patch(`/shops/${myShop.shop_id}/status`, { status: newStatus })
      setMyShop(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      console.error('Failed to update shop status', err)
      alert('Could not update shop status. Please try again.')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-indigo-700">Shop Panel</h1>
          <p className="text-xs text-gray-400 mt-1 truncate" title={myShop?.shop_name}>{myShop?.shop_name}</p>
          <button
            onClick={toggleShopStatus}
            disabled={isTogglingStatus}
            className={`mt-3 w-full text-xs font-bold py-2 px-3 rounded-lg transition-all ${
              myShop?.status === 'active'
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
            } disabled:opacity-50`}
          >
            {isTogglingStatus ? 'Updating...' : myShop?.status === 'active' ? '● Close Shop' : '○ Open Shop'}
          </button>
        </div>
        <div className="p-4 space-y-1 flex-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all text-sm ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <span className="mr-3 text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
            Online Sync Active
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {activeTab === 'overview' && 'Dashboard Overview'}
            {activeTab === 'queue' && 'Live Print Queue'}
            {activeTab === 'pricing' && 'Pricing Settings'}
            {activeTab === 'network' && 'Network Settings'}
            {activeTab === 'analytics' && 'Shop Analytics'}
            {activeTab === 'profile' && 'Shop Profile'}
          </h2>
          <p className="text-gray-500 mt-1">
            {activeTab === 'overview' && `Good day! Here's what's happening at ${myShop.shop_name} today.`}
            {activeTab === 'queue' && `Incoming jobs for ${myShop.shop_name}`}
            {activeTab === 'pricing' && 'Manage real-time page pricing for your customers'}
            {activeTab === 'network' && 'Configure WiFi for offline customers'}
            {activeTab === 'analytics' && 'Deep dive into your shop performance'}
            {activeTab === 'profile' && 'Update your shop identity and address'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : activeTab === 'overview' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Today's Revenue" value={`₹${todaysRevenue.toFixed(2)}`} sub="Incl. GST" accent="#22c55e" />
              <StatCard label="Today's Uploads" value={todaysJobs.length} sub="Total jobs received" accent="#6366f1" />
              <StatCard label="Pending" value={todaysPending} sub="Waiting to print" accent="#f59e0b" />
              <StatCard label="Completed" value={todaysPrinted} sub="Printed today" accent="#ef4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-1">Customer QR Codes</h3>
                <p className="text-gray-500 text-sm mb-6">Display these at your counter for easy customer access.</p>
                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase">1. Simple Upload</p>
                    <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                      <img src={uploadQrUrl} alt="App Upload QR" className="w-40 h-40 rounded-lg shadow-sm" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Scan to Upload & Print</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase">2. Shop WiFi</p>
                    <div className="bg-indigo-50 p-4 rounded-2xl mb-4 border border-indigo-100">
                      <img src={qrCodeUrl} alt="Local WiFi Connect QR" className="w-40 h-40 rounded-lg shadow-sm" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium tracking-tighter">Auto-Connect to Network</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 w-full mt-4">
                  <div className="flex justify-between items-center mb-2">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Secure Token URL</p>
                     {isGeneratingQr && <span className="text-xs text-indigo-500 animate-pulse font-semibold">Refreshing...</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-mono break-all text-center leading-relaxed">{displayUrl}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Recent Jobs</h3>
                  <button onClick={() => setActiveTab('queue')} className="text-indigo-600 text-sm font-semibold hover:underline">See All →</button>
                </div>
                {jobs.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No jobs today yet.</div>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 5).map(job => (
                      <div key={job.job_id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Job #{job.job_id.toString().padStart(4, '0')}</p>
                          <p className="text-xs text-gray-400">{new Date(job.created_at).toLocaleTimeString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700">₹{parseFloat(job.cost || 0).toFixed(2)}</span>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getStatusBadge(job.status)} uppercase tracking-wide`}>{job.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {todaysJobs.length > 0 && (
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Today's Job Breakdown</h3>
                <div className="flex gap-1 h-4 rounded-full overflow-hidden w-full mb-4">
                  {todaysPrinted > 0 && <div style={{ flex: todaysPrinted }} className="bg-green-500" title={`Done: ${todaysPrinted}`} />}
                  {todaysPending > 0 && <div style={{ flex: todaysPending }} className="bg-yellow-400" title={`Queued: ${todaysPending}`} />}
                  {todaysPrinting > 0 && <div style={{ flex: todaysPrinting }} className="bg-blue-500" title={`Printing: ${todaysPrinting}`} />}
                  {todaysCancelled > 0 && <div style={{ flex: todaysCancelled }} className="bg-red-400" title={`Cancelled: ${todaysCancelled}`} />}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>Done ({todaysPrinted})</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>Queued ({todaysPending})</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>Printing ({todaysPrinting})</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>Cancelled ({todaysCancelled})</span>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'queue' ? (
          jobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-200 shadow-sm mt-8">
              <h3 className="text-2xl font-bold text-gray-700 mb-2">Queue Empty</h3>
              <p className="text-gray-500 text-lg">Your printing queue is completely clear. Good job!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mt-8">
              {jobs.map(job => (
                <div key={job.job_id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-center">
                  <div className="flex-1 mb-4 sm:mb-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">Job #{job.job_id.toString().padStart(4, '0')}</h3>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadge(job.status)} uppercase tracking-wider`}>{job.status}</span>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider">{job.origin}</span>
                    </div>
                    <div className="text-sm text-gray-600 grid grid-cols-2 gap-x-8 gap-y-1">
                      <p><span className="text-gray-400 font-medium mr-1">Time:</span> {new Date(job.created_at).toLocaleTimeString()}</p>
                      <p><span className="text-gray-400 font-medium mr-1">File ID:</span> {job.file_id}</p>
                      <p><span className="text-gray-400 font-medium mr-1">Revenue:</span> ₹{job.cost}</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {job.status === 'queued' && (
                      <button onClick={() => updateJobStatus(job.job_id, 'printing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95 text-sm">Start Printing</button>
                    )}
                    {job.status === 'printing' && (
                      <button onClick={() => updateJobStatus(job.job_id, 'done')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95 text-sm">Mark Complete</button>
                    )}
                    {(job.status === 'queued' || job.status === 'printing') && (
                      <button onClick={() => updateJobStatus(job.job_id, 'cancelled')} className="bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 border border-gray-200 hover:border-red-200 text-sm">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'pricing' ? (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Add New Pricing Rule</h3>
              <form onSubmit={handleAddPricing} className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color Mode</label>
                  <select value={pricingForm.color_type} onChange={e => setPricingForm({...pricingForm, color_type: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="bw">Black &amp; White (bw)</option>
                    <option value="color">Color</option>
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Paper Size</label>
                  <select value={pricingForm.paper_size} onChange={e => setPricingForm({...pricingForm, paper_size: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price Per Page (₹)</label>
                  <input required type="number" step="0.5" min="0.5" value={pricingForm.price_per_page} onChange={e => setPricingForm({...pricingForm, price_per_page: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 2" />
                </div>
                <button disabled={isAddingPricing} type="submit" className={`px-8 py-3 rounded-xl font-bold text-white transition-all w-full md:w-auto ${isAddingPricing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}>
                  {isAddingPricing ? 'Adding...' : 'Add Rule'}
                </button>
              </form>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Current Pricings</h3>
              {pricingRules.length === 0 ? (
                <p className="text-gray-500">No pricing combinations exist. Online orders cannot be calculated until you add pricing rules!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-sm">
                        <th className="pb-3 font-semibold">Mode</th>
                        <th className="pb-3 font-semibold">Paper Size</th>
                        <th className="pb-3 font-semibold">Price Per Page</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingRules.map(rule => (
                        <tr key={rule.pricing_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-4 font-bold text-gray-800 uppercase text-sm">{rule.color_type}</td>
                          <td className="py-4 font-medium text-gray-600">{rule.paper_size}</td>
                          <td className="py-4 font-bold text-green-600">₹{parseFloat(rule.price_per_page).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'network' ? (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Configure Shop WiFi</h3>
              <p className="text-gray-500 mb-6">These details are used to generate the QR code for customers to connect to your network for file transfers.</p>
              <form onSubmit={handleSaveNetwork} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Network Name (SSID)</label>
                    <input required type="text" value={networkConfig.ssid} onChange={e => setNetworkConfig({...networkConfig, ssid: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. MyShop_WiFi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Security Type</label>
                    <select value={networkConfig.auth_type} onChange={e => setNetworkConfig({...networkConfig, auth_type: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">No Password</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">WiFi Password</label>
                  <input type="password" value={networkConfig.credential_ref} onChange={e => setNetworkConfig({...networkConfig, credential_ref: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter password" disabled={networkConfig.auth_type === 'nopass'} />
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="is_primary" checked={networkConfig.is_primary} onChange={e => setNetworkConfig({...networkConfig, is_primary: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">Set as primary network for QR code</label>
                </div>
                <button disabled={isSavingNetwork} type="submit" className={`px-8 py-3 rounded-xl font-bold text-white transition-all ${isSavingNetwork ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}>
                  {isSavingNetwork ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Preview QR Code</h3>
              <p className="text-sm text-gray-500 mb-6">Scan with a phone to verify connection details.</p>
              <div className="bg-indigo-50 p-4 rounded-2xl mb-4 border border-indigo-100">
                <img src={qrCodeUrl} alt="Network Preview" className="w-48 h-48 rounded-lg" />
              </div>
              <p className="text-xs font-mono text-gray-400">{qrDataString}</p>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                Shop Analytics
              </h2>
              <button onClick={fetchAnalytics} disabled={loadingAnalytics} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl transition-all active:scale-95">
                {loadingAnalytics ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
            {analyticsError ? (
              <div className="bg-red-50 border border-red-100 rounded-3xl p-12 text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-4xl mb-2">🚫</div>
                <h3 className="text-2xl font-black text-red-800">Permission Denied</h3>
                <p className="text-red-600 max-w-md mx-auto font-medium">
                  {analyticsError}
                </p>
                <div className="mt-4 flex gap-4">
                  <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all active:scale-95 text-sm">
                    Re-Login
                  </button>
                  <button onClick={fetchAnalytics} className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all text-sm">
                    Try Again
                  </button>
                </div>
              </div>
            ) : !analyticsData && loadingAnalytics ? (
              <div className="flex justify-center p-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
            ) : analyticsData && (analyticsData.overall.total_jobs > 0 || analyticsData.dailyTrend.length > 0) ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Lifetime Revenue</p>
                    <h3 className="text-4xl font-black text-green-600">₹{parseFloat(analyticsData.overall.total_revenue || 0).toLocaleString()}</h3>
                    <p className="text-gray-400 text-xs mt-2">Across {analyticsData.overall.total_jobs} successful jobs</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Avg. Order Value</p>
                    <h3 className="text-4xl font-black text-indigo-600">₹{parseFloat(analyticsData.overall.avg_order_value || 0).toFixed(2)}</h3>
                    <p className="text-gray-400 text-xs mt-2">Per print job average</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Busiest Revenue Day</p>
                    {analyticsData.mostRevenueDay ? (
                      <div>
                        <h3 className="text-3xl font-black text-amber-500">{new Date(analyticsData.mostRevenueDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
                        <p className="text-gray-400 text-xs mt-2">Peak revenue: ₹{parseFloat(analyticsData.mostRevenueDay.revenue).toFixed(2)}</p>
                      </div>
                    ) : (
                      <h3 className="text-3xl font-black text-gray-300">N/A</h3>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                       Most Spent Customers
                    </h3>
                    <div className="space-y-4">
                      {analyticsData.leaderboard.spending.length > 0 ? analyticsData.leaderboard.spending.map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                            <div>
                              <p className="font-bold text-gray-800">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.phone}</p>
                            </div>
                          </div>
                          <span className="font-black text-green-600">₹{parseFloat(u.total_spent).toFixed(2)}</span>
                        </div>
                      )) : <p className="text-center text-gray-400 py-10">No spending data yet</p>}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                       Most Uploads
                    </h3>
                    <div className="space-y-4">
                      {analyticsData.leaderboard.uploads.length > 0 ? analyticsData.leaderboard.uploads.map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                            <div>
                              <p className="font-bold text-gray-800">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.phone}</p>
                            </div>
                          </div>
                          <span className="bg-white px-3 py-1 rounded-full font-bold text-indigo-600 text-sm shadow-sm">{u.upload_count} files</span>
                        </div>
                      )) : <p className="text-center text-gray-400 py-10">No upload data yet</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Revenue by Method</h3>
                    <div className="space-y-4">
                      {analyticsData.revenueByMethod.map((m, i) => (
                        <div key={i} className="relative pt-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">{m.method}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-indigo-600">₹{parseFloat(m.revenue).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                            <div style={{ width: `${(parseFloat(m.revenue) / (analyticsData.overall.total_revenue || 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
                          </div>
                        </div>
                      ))}
                      {analyticsData.revenueByMethod.length === 0 && <p className="text-center text-gray-400 py-10">No payment data</p>}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 font-black uppercase text-xs tracking-tighter">Last 30 Days Revenue Trend</h3>
                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-50">
                            <th className="pb-2">Date</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {analyticsData.dailyTrend.slice().reverse().map((day, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 text-sm font-medium text-gray-600">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                              <td className="py-3 text-sm font-black text-gray-800 text-right">₹{parseFloat(day.revenue).toFixed(2)}</td>
                            </tr>
                          ))}
                          {analyticsData.dailyTrend.length === 0 && (
                            <tr><td colSpan="2" className="text-center py-10 text-gray-400">No trend data available</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl mb-2">📈</div>
                <h3 className="text-2xl font-black text-gray-800">No Analytics Data Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Once your customers start scanning QR codes and completing print jobs, your shop's revenue and engagement metrics will appear here automatically.
                </p>
                <div className="mt-4 flex gap-3">
                  <button onClick={fetchAnalytics} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 text-sm">
                    Check Again
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'profile' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <span className="p-2 bg-indigo-100 rounded-xl">🏪</span> 
              Shop Profile
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm max-w-2xl">
              <form onSubmit={handleSaveShopProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.shop_name} onChange={(e) => setShopProfileForm({...shopProfileForm, shop_name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.email} onChange={(e) => setShopProfileForm({...shopProfileForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.contact} onChange={(e) => setShopProfileForm({...shopProfileForm, contact: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address</label>
                    <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" rows="2" value={shopProfileForm.address} onChange={(e) => setShopProfileForm({...shopProfileForm, address: e.target.value})}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Area / Landmark</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.area} onChange={(e) => setShopProfileForm({...shopProfileForm, area: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.city} onChange={(e) => setShopProfileForm({...shopProfileForm, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={shopProfileForm.pincode} onChange={(e) => setShopProfileForm({...shopProfileForm, pincode: e.target.value})} />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isUpdatingShopProfile} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    {isUpdatingShopProfile ? 'Saving Changes...' : 'Save Profile Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Dashboard
