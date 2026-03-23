/**
 * components/ui/Input.jsx
 * Reusable Input / Textarea / Select with label and error state.
 */
import React from 'react'

export function Input({
  label,
  error,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-gray-600">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full h-10 px-3 rounded-xl border text-sm bg-white text-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
          ${error
            ? 'border-red-400 focus:ring-red-400/50'
            : 'border-gray-200 hover:border-gray-300 focus:border-blue-400'}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className = '', children, id, ...props }) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-gray-600">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={`
          w-full h-10 px-3 rounded-xl border text-sm bg-white text-gray-800 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
          ${error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300 focus:border-blue-400'}
          ${className}
        `}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
