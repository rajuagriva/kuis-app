'use client'

import { useState, useEffect } from 'react'
import { getAdminSubjects, updateSubject } from '@/app/admin/actions' // Pastikan path ini sesuai lokasi file actions Anda
import { Save, Loader2, BookOpen, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  // 1. Load Data saat halaman dibuka
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAdminSubjects()
        setSubjects(data)
      } catch (error) {
        console.error('Gagal ambil data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 2. Handle Perubahan Input (Tanpa simpan ke DB dulu)
  const handleChange = (id: string, field: string, value: any) => {
    setSubjects(prev => prev.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ))
  }

  // 3. Simpan ke Database
  const handleSave = async (subject: any) => {
    setSavingId(subject.id)
    setMessage(null)

    try {
      // Panggil Server Action yang baru kita buat
      await updateSubject(subject.id, subject.name, subject.code, Number(subject.mastery_threshold))
      
      setMessage({ text: `Berhasil update ${subject.code}!`, type: 'success' })
      
      // Hilangkan pesan sukses setelah 3 detik
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({ text: error.message || 'Gagal menyimpan', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
            Manajemen Mata Kuliah
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Atur nama, kode, dan tingkat kesulitan (target master) untuk setiap pelajaran.
          </p>
        </div>

        {/* Notifikasi Floating */}
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Grid Kartu Edit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub) => (
          <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
            
            {/* Header Kartu */}
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                ID: {sub.code}
              </span>
              <div className="p-1.5 bg-white rounded-md shadow-sm">
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-4">
              
              {/* Input Nama Matkul */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Mata Kuliah</label>
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => handleChange(sub.id, 'name', e.target.value)}
                  className="w-full text-sm font-bold text-gray-900 border-b border-gray-300 focus:border-indigo-600 outline-none py-1 transition-colors bg-transparent"
                />
              </div>

              {/* Input Kode & Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Kode</label>
                  <input
                    type="text"
                    value={sub.code}
                    onChange={(e) => handleChange(sub.id, 'code', e.target.value)}
                    className="w-full text-sm text-gray-700 border-b border-gray-300 focus:border-indigo-600 outline-none py-1 bg-transparent"
                  />
                </div>

                <div>
                   <label className="block text-xs font-semibold text-indigo-600 mb-1">Target Master</label>
                   <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={sub.mastery_threshold || 3}
                        onChange={(e) => handleChange(sub.id, 'mastery_threshold', e.target.value)}
                        className="w-full text-sm font-bold text-indigo-700 border border-indigo-100 bg-indigo-50 rounded-md py-1.5 px-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] text-indigo-400 font-medium">x Benar</span>
                   </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
               <span className="text-[10px] text-gray-400">
                 {sub.mastery_threshold > 5 ? 'Sulit' : sub.mastery_threshold < 3 ? 'Mudah' : 'Normal'}
               </span>
               
               <button
                 onClick={() => handleSave(sub)}
                 disabled={savingId === sub.id}
                 className="flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {savingId === sub.id ? (
                   <>
                     <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                     Menyimpan...
                   </>
                 ) : (
                   <>
                     <Save className="w-3.5 h-3.5 mr-2" />
                     Simpan
                   </>
                 )}
               </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}