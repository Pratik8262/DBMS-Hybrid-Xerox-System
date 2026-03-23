/**
 * store/auth.store.js
 * Zustand store for authentication state.
 * Persists to localStorage so sessions survive page refresh.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:   null,
      token:  null,
      shopId: null,
      role:   null,
      stats:  { total_uploads: 0, total_spent: 0 },

      setAuth: ({ user, token, shopId = null, role = 'customer' }) => {
        set({ user, token, shopId, role })
      },

      fetchStats: async (api) => {
        const user = get().user
        if (!user || !user.user_id) return
        try {
          const res = await api.get(`/users/stats/${user.user_id}`)
          set({ stats: res.data.data })
        } catch (err) {
          console.error('Failed to fetch user stats:', err)
        }
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : updates,
      })),

      logout: () => {
        set({ user: null, token: null, shopId: null, role: null, stats: { total_uploads: 0, total_spent: 0 } })
        localStorage.removeItem('token')
        localStorage.removeItem('printeasy_user_id')
        localStorage.removeItem('printeasy_owner_email')
      },

      isAuthenticated: () => !!get().token,

      isShopkeeper: () => get().role === 'shopkeeper',
    }),
    {
      name: 'printeasy-auth',
      partialize: (state) => ({
        user:   state.user,
        token:  state.token,
        shopId: state.shopId,
        role:   state.role,
      }),
    }
  )
)
