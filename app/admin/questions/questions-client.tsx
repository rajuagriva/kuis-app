'use client'

import { useState, useEffect } from 'react'
// UPDATE: Tambahkan 'deleteEntity' di import
import { getQuestionsByModule, updateQuestion, deleteQuestion, deleteEntity } from '@/app/admin/actions'
import { Search, FileText, Trash2, Save, Edit2, Loader2, AlertCircle, FolderX } from 'lucide-react'

export default function QuestionsClient({ initialModules }: { initialModules: any[] }) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  
  // State Modules perlu kita simpan di state lokal agar bisa di-update (dihapus) secara realtime
  const [modules, setModules] = useState<any[]>(initialModules)
  
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // State Filter Modul
  const [searchModule, setSearchModule] = useState('')

  // State Edit Soal
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ content: '', explanation: '' })
  const [isSaving, setIsSaving] = useState(false)

  // Filter tampilan modul
  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(searchModule.toLowerCase()) ||
    m.source?.subject?.name.toLowerCase().includes(searchModule.toLowerCase())
  )

  // 1. FETCH SOAL SAAT MODUL DIPILIH
  useEffect(() => {
    if (selectedModuleId) {
      setLoading(true)
      getQuestionsByModule(selectedModuleId)
        .then((data) => {
          setQuestions(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setLoading(false)
        })
    } else {
      setQuestions([])
    }
  }, [selectedModuleId])

  // 2. HANDLER EDIT SOAL
  const startEdit = (q: any) => {
    setEditingId(q.id)
    setEditForm({ content: q.content, explanation: q.explanation || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ content: '', explanation: '' })
  }

  const handleSave = async (id: string) => {
    setIsSaving(true)
    try {
      await updateQuestion(id, editForm.content, editForm.explanation)
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...editForm } : q))
      setEditingId(null)
    } catch (error) {
      alert('Gagal menyimpan perubahan')
    } finally {
      setIsSaving(false)
    }
  }

  // 3. HANDLER DELETE SOAL
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return

    try {
      setQuestions(prev => prev.filter(q => q.id !== id))
      await deleteQuestion(id)
    } catch (error) {
      alert('Gagal menghapus soal')
    }
  }

  // 4. (BARU) HANDLER DELETE MODUL
  const handleDeleteModule = async (e: React.MouseEvent, moduleId: string, moduleName: string) => {
    // Stop Propagation agar saat klik tong sampah, modulnya TIDAK terpilih
    e.stopPropagation() 

    if (!confirm(`Yakin hapus modul "${moduleName}"? Semua soal di dalamnya akan ikut terhapus!`)) return

    try {
      // Panggil Server Action
      await deleteEntity('modules', moduleId)
      
      // Update UI: Buang modul dari list
      setModules(prev => prev.filter(m => m.id !== moduleId))
      
      // Jika modul yang dihapus sedang dipilih, reset pilihan
      if (selectedModuleId === moduleId) {
        setSelectedModuleId(null)
        setQuestions([])
      }
    } catch (error) {
      alert('Gagal menghapus modul.')
      console.error(error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[650px]">
      
      {/* --- KOLOM KIRI: DAFTAR MODUL --- */}
      <div className="bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Cari Mata Kuliah / Modul..." 
               value={searchModule}
               onChange={(e) => setSearchModule(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filteredModules.map(mod => (
            <div
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className={`group w-full text-left p-3 rounded-lg transition-all border cursor-pointer flex justify-between items-center ${
                selectedModuleId === mod.id 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' 
                  : 'hover:bg-gray-50 border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 truncate">
                  {mod.source?.subject?.name || 'Tanpa Matkul'}
                </div>
                <div className={`font-semibold text-sm truncate ${selectedModuleId === mod.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {mod.name}
                </div>
              </div>

              {/* TOMBOL HAPUS MODUL (Muncul saat Hover) */}
              <button
                onClick={(e) => handleDeleteModule(e, mod.id, mod.name)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Hapus Modul & Soal"
              >
                <FolderX className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {filteredModules.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">Modul tidak ditemukan.</div>
          )}
        </div>
      </div>

      {/* --- KOLOM KANAN: DAFTAR SOAL --- */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden relative">
        
        {!selectedModuleId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <FileText className="w-16 h-16 mb-4 opacity-20" />
             <p>Pilih modul di sebelah kiri untuk melihat soal.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full text-indigo-600">
             <Loader2 className="w-10 h-10 animate-spin mb-2" />
             <p className="text-sm font-medium">Memuat soal...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
             <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-gray-800">Daftar Soal ({questions.length})</h3>
             </div>

             <div className="overflow-y-auto flex-1 p-4 space-y-4 bg-gray-50/50">
               {questions.map((q, index) => (
                 <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                   
                   {editingId === q.id ? (
                     /* MODE EDIT */
                     <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <div>
                          <label className="text-xs font-bold text-gray-500">Pertanyaan</label>
                          <textarea 
                            value={editForm.content}
                            onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                            className="w-full mt-1 p-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">Pembahasan</label>
                          <textarea 
                            value={editForm.explanation}
                            onChange={(e) => setEditForm({...editForm, explanation: e.target.value})}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                           <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300">Batal</button>
                           <button onClick={() => handleSave(q.id)} disabled={isSaving} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1">
                             {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>} Simpan
                           </button>
                        </div>
                     </div>
                   ) : (
                     /* MODE VIEW */
                     <div className="group relative">
                        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEdit(q)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit Soal"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus Soal"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        <div className="flex gap-3">
                           <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold mt-0.5">{index + 1}</span>
                           <div className="flex-1 pr-16">
                              <p className="text-gray-800 text-sm font-medium mb-2 whitespace-pre-wrap">{q.content}</p>
                              {q.explanation && (
                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 italic">
                                   <span className="font-bold not-italic text-gray-400">Pembahasan: </span>{q.explanation}
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                   )}
                 </div>
               ))}

               {questions.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                   <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
                   <p className="text-sm">Belum ada soal di modul ini.</p>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}