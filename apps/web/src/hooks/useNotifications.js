/**
 * hooks/useNotifications.js
 * TanStack Query hooks for notifications.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
    refetchInterval: 30000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notificationId) =>
      api.patch(`/notifications/${notificationId}/read`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })
}
