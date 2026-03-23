/**
 * components/ui/Button.jsx
 * Reusable Button with variants and loading state.
 */
import React from 'react'

const variants = {
  primary:   'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-60',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm',
  danger:    'bg-red-500 text-white hover:bg-red-600 shadow-md',
  ghost:     'text-gray-600 hover:bg-gray-100',
  success:   'bg-green-500 text-white hover:bg-green-600 shadow-md',
}

const sizes = {
  sm:  'h-8  px-3 text-xs rounded-lg',
  md:  'h-10 px-4 text-sm rounded-xl',
  lg:  'h-12 px-6 text-base rounded-xl',
  xl:  'h-14 px-8 text-base rounded-2xl',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${variants[variant]} ${sizes[size]} ${className}
        ${disabled || loading ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
        </svg>
      )}
      {children}
    </button>
  )
}
