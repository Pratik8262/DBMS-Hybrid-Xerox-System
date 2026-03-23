/**
 * hooks/useAuth.js
 * Abstracts auth store access + login/register API calls.
 */
import { useAuthStore } from '../store/auth.store'
import api from '../services/api'
import { connect as connectSocket } from '../services/socket'

export function useAuth() {
  const { user, token, role, shopId, setAuth, logout: clearAuth, isAuthenticated, isShopkeeper } = useAuthStore()

  const login = async ({ phone, password }) => {
    const res = await api.post('/auth/login', { phone, password })
    const { token, user, shopId, role } = res.data.data
    setAuth({ user, token, shopId, role })
    // Connect socket immediately after login
    connectSocket(token)
    return { user, role }
  }

  const register = async ({ name, phone, email, password, device_id }) => {
    const res = await api.post('/auth/register', { name, phone, email, password, device_id })
    const data = res.data.data
    setAuth({ user: data.user, token: data.token, role: 'customer' })
    connectSocket(data.token)
    return data
  }

  const logout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return {
    user,
    token,
    role,
    shopId,
    isAuthenticated: isAuthenticated(),
    isShopkeeper: isShopkeeper(),
    login,
    register,
    logout,
  }
}
