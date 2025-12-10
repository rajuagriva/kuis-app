'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminModules, getQuestionsByModule, updateQuestion, deleteQuestion, deleteEntity } from '@/app/admin/actions'
import { ArrowLeft, Edit2, Trash2, Save, X, Loader2, AlertTriangle } from 'lucide-react'

// Tipe data sederhana
interface Question {
  id: string
  content: string
  explanation: string
}

export default function AdminQuestionsPage() {
  const router = useRouter()
  
  // State Data
  const [modules, setModules] = useState<any[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedModule, setSelectedModule] = useState('')
  
  // State UI
  const [loading, setLoading] = useState(false)
  const [editingQ, setEditingQ] = useState<Question | null>(null)

  // 1. Load Modules saat pertama kali buka
  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    const data = await getAdminModules()
    setModules(data)
  }

  // 2. Load Questions saat Modul dipilih
  useEffect(() => {
    if (!selectedModule) {
      setQuestions([])
      return
    }
    const loadQuestions = async () => {
      setLoading(true)
      const data = await getQuestionsByModule(selectedModule)
      setQuestions(data as Question[])
      setLoading(false)
    }
    loadQuestions()
  }, [selectedModule])

  // --- LOGIC HAPUS ENTITAS UTAMA (Subject/Source/Module) ---
  async function handleDeleteEntity(type: 'subjects'|'sources'|'modules', id: string, name: string) {
    const label = type === 'subjects' ? 'Mata Kuliah' : type === 'sources' ? 'Kategori' : 'Modul'
    
    if (!confirm(`⚠️ PERINGATAN KERAS!\n\nAnda akan menghapus ${label}: "${name}".\n\nSemua data di dalamnya (Modul, Soal, Jawaban) akan IKUT TERHAPUS PERMANEN.\n\nLanjutkan?`)) return

    try {
      await deleteEntity(type, id)
      alert(`${label} berhasil dihapus.`)
      // Reset seleksi dan reload
      setSelectedModule('')
      loadModules()
    } catch (error: any) {
      alert('Gagal menghapus: ' + error.message)
    }
  }

  // Helper untuk mencari ID Induk dari Modul yang terpilih
  // (Agak tricky karena struktur data kita flat list modules)
  // Kita cari objek modul yang sedang dipilih
  const currentModObj = modules.find(m => m.id === selectedModule)
  const currentSource = currentModObj?.source
  const currentSubject = currentSource?.subject

  // --- LOGIC CRUD SOAL ---
  async function handleDeleteQuestion(id: string) {
    if (!confirm('Hapus soal ini?')) return
    try {
      await deleteQuestion(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (error) { alert('Gagal menghapus soal') }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingQ) return
    try {
      await updateQuestion(editingQ.id, editingQ.content, editingQ.explanation || '')
      setQuestions(prev => prev.map(q => (q.id === editingQ.id ? editingQ : q)))
      setEditingQ(null)
    } catch (error) { alert('Gagal menyimpan perubahan') }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Data & Soal</h1>
            <p className="text-gray-500">Hapus Mata Kuliah/Modul atau Edit butir soal.</p>
          </div>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-4 py-2 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </button>
        </div>

        {/* AREA KONTROL HIRARKI */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-6">
          
          {/* 1. Pilih Modul (Dropdown Utama) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Modul untuk Dikelola</label>
            <select 
              className="block w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">-- Cari / Pilih Modul --</option>
              {modules.map((mod) => (
                <option key={mod.id} value={mod.id}>
                   {mod.source?.subject?.name} ➜ {mod.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">*Pilih modul di atas untuk memunculkan opsi hapus Matkul/Kategori.</p>
          </div>

          {/* 2. Panel Informasi & Hapus (Muncul jika Modul dipilih) */}
          {selectedModule && currentModObj && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 bg-gray-50/50 p-4 rounded-lg">
              
              {/* Box Mata Kuliah */}
              <div className="p-3 border rounded bg-white">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Mata Kuliah</span>
                <div className="flex justify-between items-center">
                   <span className="text-sm font-medium truncate mr-2" title={currentSubject?.name}>{currentSubject?.name}</span>
                   <button 
                      onClick={() => handleDeleteEntity('subjects', currentSubject.id, currentSubject.name)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded" 
                      title="Hapus Mata Kuliah Ini"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Box Sumber */}
              <div className="p-3 border rounded bg-white">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Kategori / Sumber</span>
                <div className="flex justify-between items-center">
                   <span className="text-sm font-medium truncate mr-2" title={currentSource?.name}>{currentSource?.name}</span>
                   <button 
                      onClick={() => handleDeleteEntity('sources', currentSource.id, currentSource.name)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                      title="Hapus Kategori Ini"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {/* Box Modul */}
              <div className="p-3 border rounded bg-white border-indigo-200 ring-1 ring-indigo-50">
                <span className="text-xs text-indigo-400 uppercase font-bold block mb-1">Modul (Aktif)</span>
                <div className="flex justify-between items-center">
                   <span className="text-sm font-medium truncate mr-2 text-indigo-900" title={currentModObj.name}>{currentModObj.name}</span>
                   <button 
                      onClick={() => handleDeleteEntity('modules', currentModObj.id, currentModObj.name)}
                      className="text-red-600 hover:bg-red-100 p-1.5 rounded bg-red-50"
                      title="Hapus Modul Ini"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* TABEL SOAL */}
        {selectedModule && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-700">Daftar Soal ({questions.length})</h3>
            </div>
            
            {loading ? (
              <div className="p-10 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat soal...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                Tidak ada soal di modul ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konten Soal</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {questions.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500 align-top">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 align-top">
                          <p className="whitespace-pre-wrap mb-2">{q.content}</p>
                          {q.explanation && (
                            <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded inline-block border border-yellow-100">
                              💡 Pembahasan: {q.explanation}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                          <div className="flex justify-center space-x-2">
                            <button onClick={() => setEditingQ(q)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL EDIT (Sama seperti sebelumnya) */}
        {editingQ && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900">Edit Soal</h3>
                <button onClick={() => setEditingQ(null)}><X className="w-6 h-6 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soal</label>
                  <textarea className="w-full border p-3 rounded-lg h-32" value={editingQ.content} onChange={(e) => setEditingQ({ ...editingQ, content: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pembahasan</label>
                  <textarea className="w-full border p-3 rounded-lg h-24 bg-gray-50" value={editingQ.explanation || ''} onChange={(e) => setEditingQ({ ...editingQ, explanation: e.target.value })} />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button type="button" onClick={() => setEditingQ(null)} className="px-4 py-2 border rounded text-gray-600">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}