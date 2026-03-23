import { create } from 'zustand'

export const useJobStore = create((set) => ({
  files: [],
  currentJob: null,
  selectedShop: null,
  
  addFile: (file) => set((state) => ({ 
    files: [...state.files, { 
      id: file.id || Math.random().toString(36).substr(2, 9),
      file: file,
      settings: {
        color_mode: 'bw',
        paper_size: 'A4',
        copies: 1,
        orientation: 'portrait',
        scaling: 'fit',
        sides: 'simplex'
      }
    }] 
  })),

  updateFileSettings: (id, newSettings) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, settings: { ...f.settings, ...newSettings } } : f)
  })),

  removeFile: (id) => set((state) => ({ 
    files: state.files.filter(f => f.id !== id) 
  })),

  clearFiles: () => set({ files: [] }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setSelectedShop: (shopId) => set({ selectedShop: shopId })
}))
