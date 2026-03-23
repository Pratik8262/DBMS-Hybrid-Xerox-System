import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import api from './services/api'
import { connect as connectSocket } from './services/socket'

// Customer pages
import UploadPage   from './pages/customer/Upload'
import CheckoutPage from './pages/customer/Checkout'
import StatusPage   from './pages/customer/Status'
import OrdersPage   from './pages/customer/Orders'
import HomePage     from './pages/customer/Home'

// Auth
import Login from './pages/auth/Login'

// Shopkeeper
import Dashboard     from './pages/shopkeeper/Dashboard'
import Pricing       from './pages/shopkeeper/Pricing'
import PrinterStatus from './pages/shopkeeper/PrinterStatus'

// Offline
import QRLanding     from './pages/offline/QRLanding'
import OfflineUpload from './pages/offline/OfflineUpload'

// Shared
import ProtectedRoute from './components/shared/ProtectedRoute'

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = () => {
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const { user, logout, stats, fetchStats } = useAuthStore()

  // Fetch stats whenever dropdown is opened or on mount if logged in
  useEffect(() => {
    if (user) fetchStats(api)
  }, [user, isDropdownOpen])

  const hiddenPaths = ['/login', '/shopkeeper', '/offline', '/offline/upload']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/home" className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            PrintEasy
          </Link>
        </div>

        <div className="flex items-center space-x-8">
          <div className="hidden md:flex space-x-6 text-sm font-semibold text-gray-600">
            <Link to="/home"   className={`hover:text-blue-600 transition-colors ${location.pathname === '/home'   ? 'text-blue-600' : ''}`}>Home</Link>
            <Link to="/upload" className={`hover:text-blue-600 transition-colors ${location.pathname === '/upload' ? 'text-blue-600' : ''}`}>New Print</Link>
            <Link to="/orders" className={`hover:text-blue-600 transition-colors ${location.pathname === '/orders' ? 'text-blue-600' : ''}`}>My Orders</Link>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group relative w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-lg hover:shadow-blue-200/50 transition-all active:scale-95"
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-blue-600 font-black text-sm group-hover:bg-transparent group-hover:text-white transition-all">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-4 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-4 mb-2 border border-blue-100/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-200">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 leading-tight truncate px-1 uppercase tracking-tight text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{user?.name || 'User'}</p>
                      <p className="text-[11px] font-semibold text-blue-600/70 truncate px-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {user?.email || user?.phone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-blue-100/50">
                    <div className="bg-white/60 p-2.5 rounded-xl border border-blue-50 shadow-sm text-center transform hover:scale-[1.02] transition-transform">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Uploads</p>
                      <p className="text-xl font-black text-blue-600 leading-none">{stats?.total_uploads || 0}</p>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-xl border border-blue-50 shadow-sm text-center transform hover:scale-[1.02] transition-transform">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Spent</p>
                      <p className="text-xl font-black text-indigo-600 leading-none">
                        <span className="text-sm mr-0.5 font-bold">₹</span>
                        {Math.floor(stats?.total_spent || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 p-1">
                  <Link to="/orders" onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-bold text-gray-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all group">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-white/20 flex items-center justify-center mr-3 transition-colors text-lg">📦</span> 
                    My Orders
                  </Link>
                  <button onClick={() => { setIsDropdownOpen(false); logout() }}
                    className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all group text-left">
                    <span className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-white/20 flex items-center justify-center mr-3 transition-colors text-lg">🚪</span> 
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />}
    </nav>
  )
}

const RootLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Navbar />
    {children}
  </div>
)

const RootRedirect = () => {
  const [params] = useSearchParams()
  const qrToken = params.get('token')
  const { token } = useAuthStore()

  if (qrToken) {
    return <Navigate to={`/offline?${params.toString()}`} replace />
  }
  return <Navigate to={token ? '/home' : '/login'} replace />
}

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  const { token: storeToken, user, setAuth } = useAuthStore()
  const token = storeToken || localStorage.getItem('token')

  // Fetch user profile if token exists but user is missing
  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const profile = res.data.data.user
          setAuth({ user: profile, token })
        })
        .catch(() => {
          // Token might be invalid
          localStorage.removeItem('token')
        })
    }
  }, [token, user, setAuth])

  // Reconnect socket on page refresh if already logged in
  useEffect(() => {
    if (token) connectSocket(token)
  }, [token])

  return (
    <BrowserRouter>
      <RootLayout>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Customer */}
          <Route path="/home"     element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/upload"   element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/status"   element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
          <Route path="/orders"   element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />

          {/* Shopkeeper */}
          <Route path="/shopkeeper" element={<Dashboard />} />
          <Route path="/shopkeeper/pricing"  element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/shopkeeper/printers" element={<ProtectedRoute><PrinterStatus /></ProtectedRoute>} />

          {/* Offline (no auth — QR token proves identity) */}
          <Route path="/offline"        element={<QRLanding />} />
          <Route path="/offline/upload" element={<OfflineUpload />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={token ? '/home' : '/login'} replace />} />
        </Routes>
      </RootLayout>
    </BrowserRouter>
  )
}

export default App

