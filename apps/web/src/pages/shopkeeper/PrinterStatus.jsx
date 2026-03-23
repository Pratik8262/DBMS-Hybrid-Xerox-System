/**
 * pages/shopkeeper/PrinterStatus.jsx
 * Shows live status of all printers for the shop.
 */
import React from 'react'
import { useShopPrinters } from '../../hooks/usePrinter'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const statusIcon = { online: '🟢', offline: '🔴', error: '🟡', busy: '🔵' }
const protocolLabel = { ipp: 'IPP', cups: 'CUPS', raw_tcp: 'RAW TCP' }

export default function PrinterStatus({ shopId }) {
  const resolvedShopId = shopId || localStorage.getItem('printeasy_shop_id')
  const { data: printers, isLoading, refetch } = useShopPrinters(resolvedShopId)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Printer Status</h2>
        <button
          onClick={refetch}
          className="text-sm text-blue-600 font-semibold hover:underline"
        >↻ Refresh</button>
      </div>

      {!printers?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🖨️</p>
          <p className="font-semibold">No printers configured</p>
          <p className="text-sm mt-1">Add a printer to your shop to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {printers.map(printer => (
            <div key={printer.printer_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{statusIcon[printer.status] || '⚪'}</span>
                    <h3 className="font-bold text-gray-800">{printer.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 font-mono">{printer.ip_address}</p>
                </div>
                <Badge variant={printer.status} label={printer.status} />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="bg-gray-100 px-2 py-1 rounded-lg font-mono">
                  {protocolLabel[printer.protocol] || printer.protocol}
                </span>
                <span>Last seen: {formatDate(printer.last_seen)}</span>
              </div>

              {printer.capabilities && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  {Object.entries(typeof printer.capabilities === 'string'
                    ? JSON.parse(printer.capabilities)
                    : printer.capabilities
                  ).slice(0, 3).map(([k, v]) => (
                    <span key={k} className="mr-3 capitalize">{k}: <strong>{String(v)}</strong></span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
