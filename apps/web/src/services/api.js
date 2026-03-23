import axios from 'axios'

// Create the api instance with a default base
const api = axios.create({
  withCredentials: true
})

// Dynamically set baseURL for each request to ensure we pick up 
// any changes to localStorage (like after a QR scan) or mobile hostname.
api.interceptors.request.use((config) => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const { hostname } = window.location
  const savedPort = localStorage.getItem('printeasy_api_port')
  
  if (savedPort && url.includes(':3000')) {
    url = url.replace(':3000', `:${savedPort}`)
  }

  if (url.includes('localhost') && hostname !== 'localhost') {
    url = url.replace('localhost', hostname)
  }

  config.baseURL = url
  
  // Inject auth tokens — read from Zustand persisted store (key: printeasy-auth)
  // since the token is never stored at a standalone 'token' localStorage key
  let token = null
  try {
    const authStore = localStorage.getItem('printeasy-auth')
    if (authStore) {
      const parsed = JSON.parse(authStore)
      token = parsed?.state?.token || null
    }
  } catch (e) {
    // ignore JSON parse errors
  }
  // Fallback to legacy standalone key for backwards compat
  if (!token) token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
