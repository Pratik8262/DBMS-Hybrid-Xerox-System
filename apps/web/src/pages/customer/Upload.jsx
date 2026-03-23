import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileUploader } from '../../components/shared/FileUploader'
import { useJobStore } from '../../store/job.store'

const Upload = () => {
  const { files, addFile, removeFile, selectedShop, setSelectedShop } = useJobStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  React.useEffect(() => {
    const shopId = searchParams.get('shopId')
    if (shopId) {
      setSelectedShop(shopId)
    }
  }, [searchParams, setSelectedShop])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-8 sm:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Print Document</h1>
          <p className="text-lg text-gray-600">Upload your files and get them printed instantly.</p>
        </div>
        
        <FileUploader onUpload={addFile} />

        {files.length > 0 && (
          <div className="mt-12 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
              Uploaded Files
            </h2>
            <div className="space-y-4">
              {files.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">{item.file.name}</p>
                      <p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end pb-2">
              <button 
                onClick={() => navigate('/checkout')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all w-full sm:w-auto text-center"
              >
                Configure Print Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Upload
