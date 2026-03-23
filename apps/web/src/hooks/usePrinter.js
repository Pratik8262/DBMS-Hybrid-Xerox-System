/**
 * hooks/usePrinter.js
 * TanStack Query hooks for printer status.
 */
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export function useShopPrinters(shopId) {
  return useQuery({
    queryKey: ['printers', shopId],
    queryFn: () => api.get(`/printers/${shopId}`).then(r => r.data.data),
    enabled: !!shopId,
    refetchInterval: 30000, // refresh every 30s
  })
}

export function useOnlinePrinters(shopId) {
  const { data: printers, ...rest } = useShopPrinters(shopId)
  return {
    ...rest,
    data: printers?.filter(p => p.status === 'online') ?? [],
  }
}
