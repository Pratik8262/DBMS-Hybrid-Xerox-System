import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('printeasy_user_id')
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const shopId = searchParams.get('shopId')

  if (!token || !userId) {
    // Redirect to login but keep the current path and shopId for after login
    const search = shopId ? `?shopId=${shopId}` : ''
    return <Navigate to={`/login${search}`} state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
