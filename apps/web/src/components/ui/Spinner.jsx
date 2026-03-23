/**
 * components/ui/Spinner.jsx
 * Loading spinner in various sizes.
 */
import React from 'react'

const sizes = {
  xs:  'h-3 w-3 border',
  sm:  'h-4 w-4 border-2',
  md:  'h-6 w-6 border-2',
  lg:  'h-8 w-8 border-3',
  xl:  'h-12 w-12 border-4',
}

export function Spinner({ size = 'md', className = '', color = 'border-blue-600' }) {
  return (
    <div
      className={`
        animate-spin rounded-full border-transparent
        ${sizes[size]} ${color} border-t-current ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Spinner size="xl" />
      <p className="text-sm text-gray-400 font-medium">{message}</p>
    </div>
  )
}
