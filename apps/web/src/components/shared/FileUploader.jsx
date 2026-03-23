import React, { useCallback, useState } from 'react'
import api from '../../services/api'
import { useJobStore } from '../../store/job.store'

export const FileUploader = ({ onUpload }) => {
  const { selectedShop } = useJobStore()
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = async (file) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('document', file)
      if (selectedShop) {
        formData.append('shop_id', selectedShop)
      }
      
      const { data } = await api.post('/files/upload', formData)
      
      onUpload({ 
        id: data.data.file_id || data.data.uuid, 
        name: file.name, 
        size: file.size, 
        objectUrl: URL.createObjectURL(file), // Local preview
        dbFile: data.data // Keep the server reference
      })
    } catch (error) {
      console.error("Upload failed", error)
      alert("Upload failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className={`w-full max-w-xl mx-auto mt-8 p-12 text-center rounded-2xl border-2 border-dashed transition-all duration-300 ${dragActive ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md backdrop-blur-sm`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-blue-100 rounded-full text-blue-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">Drag & Drop your documents</h3>
        <p className="text-sm text-gray-500">PDF, DOCX, JPG, PNG up to 50MB</p>
        <div className="pt-4">
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-sm inline-block">
            {loading ? "Uploading..." : "Browse Files"}
            <input type="file" className="hidden" onChange={handleChange} accept=".pdf,.docx,.jpg,.jpeg,.png,.txt" />
          </label>
        </div>
      </div>
    </div>
  )
}
