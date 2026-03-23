/**
 * hooks/useJob.js
 * TanStack Query hooks for print job CRUD.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

// ── Fetch ──────────────────────────────────────────────────────────────────────

export function useJob(jobId) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data.data),
    enabled: !!jobId,
    refetchInterval: 5000, // poll every 5s while job is in progress
  })
}

export function useSessionJobs(sessionId) {
  return useQuery({
    queryKey: ['jobs', 'session', sessionId],
    queryFn: () => api.get(`/jobs/session/${sessionId}`).then(r => r.data.data),
    enabled: !!sessionId,
  })
}

export function useShopJobs(shopId, status) {
  return useQuery({
    queryKey: ['jobs', 'shop', shopId, status],
    queryFn: () => api.get(`/jobs/shop/${shopId}`, { params: { status } }).then(r => r.data.data),
    enabled: !!shopId,
    refetchInterval: 10000,
  })
}

export function useUserJobs() {
  return useQuery({
    queryKey: ['jobs', 'user'],
    queryFn: () => api.get('/jobs/user/me').then(r => r.data.data),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobData) => api.post('/jobs', jobData).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries(['jobs']),
  })
}

export function useCreateBatchJobs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (batchData) => api.post('/jobs/batch', batchData).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries(['jobs']),
  })
}

export function useCancelJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId) => api.patch(`/jobs/${jobId}/cancel`).then(r => r.data.data),
    onSuccess: (_, jobId) => qc.invalidateQueries(['job', jobId]),
  })
}

export function useUpdateJobStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, status, error_code }) =>
      api.patch(`/jobs/${jobId}/status`, { status, error_code }).then(r => r.data.data),
    onSuccess: (data) => qc.invalidateQueries(['job', data.job_id]),
  })
}
