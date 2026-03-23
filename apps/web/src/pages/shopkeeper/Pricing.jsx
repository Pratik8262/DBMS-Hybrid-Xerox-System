/**
 * pages/shopkeeper/Pricing.jsx
 * Manage per-shop pricing rules.
 */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Select, Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'

const emptyForm = {
  color_type: 'bw', paper_size: 'A4', finishing_type: 'none',
  duplex_supported: false, price_per_page: '',
}

export default function Pricing({ shopId }) {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const resolvedShopId = shopId || localStorage.getItem('printeasy_shop_id')

  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing', resolvedShopId],
    queryFn: () => api.get(`/pricing/${resolvedShopId}`).then(r => r.data.data),
    enabled: !!resolvedShopId,
  })

  const { mutate: create, isLoading: creating } = useMutation({
    mutationFn: (data) => api.post('/pricing', { ...data, shop_id: Number(resolvedShopId) }),
    onSuccess: () => { qc.invalidateQueries(['pricing', resolvedShopId]); setShowModal(false); setForm(emptyForm) },
  })

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Pricing Rules</h2>
        <Button size="sm" onClick={() => setShowModal(true)}>+ Add Rule</Button>
      </div>

      {!pricing?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold">No pricing rules yet</p>
          <p className="text-sm mt-1">Add your first rule to start taking orders.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                {['Color', 'Paper', 'Finishing', 'Duplex', 'Price/Page'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pricing.map(p => (
                <tr key={p.pricing_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-700 uppercase">{p.color_type}</td>
                  <td className="px-5 py-4 text-gray-600">{p.paper_size}</td>
                  <td className="px-5 py-4">
                    <Badge variant="info" label={p.finishing_type} showDot={false} />
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={p.duplex_supported ? 'success' : 'offline'}
                      label={p.duplex_supported ? 'Yes' : 'No'}
                      showDot={false}
                    />
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-800">
                    ₹{Number(p.price_per_page).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Pricing Rule">
        <div className="space-y-4">
          <Select label="Color Type" value={form.color_type} onChange={update('color_type')}>
            <option value="bw">Black & White</option>
            <option value="color">Color</option>
            <option value="grayscale">Grayscale</option>
          </Select>
          <Select label="Paper Size" value={form.paper_size} onChange={update('paper_size')}>
            <option value="A4">A4</option><option value="A3">A3</option>
            <option value="Letter">Letter</option><option value="Legal">Legal</option>
          </Select>
          <Select label="Finishing Type" value={form.finishing_type} onChange={update('finishing_type')}>
            <option value="none">None</option><option value="staple">Staple</option>
            <option value="binding">Binding</option><option value="laminate">Laminate</option>
          </Select>
          <Input label="Price per Page (₹)" type="number" step="0.01" min="0"
            value={form.price_per_page} onChange={update('price_per_page')} placeholder="e.g. 1.50" />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.duplex_supported} onChange={update('duplex_supported')}
              className="w-4 h-4 rounded" />
            Duplex supported
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={creating}
              onClick={() => create({ ...form, price_per_page: parseFloat(form.price_per_page) })}>
              Save Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
