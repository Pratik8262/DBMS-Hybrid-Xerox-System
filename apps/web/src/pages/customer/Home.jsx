/**
 * pages/customer/Home.jsx
 * Landing page for logged-in customers — shows nearby shops and recent jobs.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export default function Home() {
  const { data: shops, isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: () => api.get('/shops').then(r => r.data.data),
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 text-white mb-10 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/30" />
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/20" />
        </div>
        <h1 className="text-3xl font-black mb-2">Print Anything, Anywhere 🖨️</h1>
        <p className="text-blue-100 mb-6 max-w-md">Upload your document, select a shop nearby, and get it printed in minutes — online or offline.</p>
        <Link to="/upload">
          <Button variant="secondary" size="lg" className="font-bold text-blue-700">
            📄 Start Printing
          </Button>
        </Link>
      </div>

      {/* Shops */}
      <h2 className="text-xl font-bold text-gray-800 mb-5">Available Print Shops</h2>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : shops?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🏪</p>
          <p className="text-lg font-semibold">No shops available yet</p>
          <p className="text-sm">Check back soon!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {shops?.map(shop => (
            <Link
              key={shop.shop_id}
              to={`/upload?shopId=${shop.shop_id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {shop.shop_name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {shop.shop_address?.area}, {shop.shop_address?.city}
                  </p>
                </div>
                <Badge variant={shop.status === 'active' ? 'online' : 'offline'} label={shop.status} />
              </div>
              <p className="text-xs text-gray-400 mt-3">{shop.email}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-10 bg-gray-50 rounded-2xl p-6 flex flex-col sm:flex-row gap-4">
        <Link to="/upload" className="flex-1">
          <div className="bg-white rounded-xl border border-blue-100 p-4 flex items-center gap-3 hover:shadow-sm hover:border-blue-300 transition-all cursor-pointer">
            <span className="text-3xl">📄</span>
            <div>
              <p className="font-bold text-gray-700 text-sm">Upload Document</p>
              <p className="text-xs text-gray-400">PDF, DOCX, JPG, PNG</p>
            </div>
          </div>
        </Link>
        <Link to="/orders" className="flex-1">
          <div className="bg-white rounded-xl border border-indigo-100 p-4 flex items-center gap-3 hover:shadow-sm hover:border-indigo-300 transition-all cursor-pointer">
            <span className="text-3xl">📦</span>
            <div>
              <p className="font-bold text-gray-700 text-sm">My Orders</p>
              <p className="text-xs text-gray-400">Track your print jobs</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
