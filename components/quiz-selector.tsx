'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuizSession, getSources, getModules } from '@/app/quiz/actions'
import { BookOpen, Clock, CheckSquare, Square } from 'lucide-react'

interface OptionItem { id: string; name: string }

export default function QuizSelector({ initialSubjects }: { initialSubjects: any[] }) {
  const router = useRouter()
  
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([]) 
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<'exam' | 'study'>('exam')
  const [isLoading, setIsLoading] = useState(false)

  const [sources, setSources] = useState<OptionItem[]>([])
  const [modules, setModules] = useState<OptionItem[]>([])
  
  const [loadingSources, setLoadingSources] = useState(false)
  const [loadingModules, setLoadingModules] = useState(false)

  async function handleSubjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const subjectId = e.target.value; setSelectedSubject(subjectId); setSelectedSource(''); setSelectedModules([]); setModules([])
    if (subjectId) {
      setLoadingSources(true); const data = await getSources(subjectId); setSources(data); setLoadingSources(false)
    } else { setSources([]) }
  }

  async function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sourceId = e.target.value; setSelectedSource(sourceId); setSelectedModules([])
    if (sourceId) {
      setLoadingModules(true); const data = await getModules(sourceId); setModules(data); setLoadingModules(false)
    } else { setModules([]) }
  }

  function toggleModule(moduleId: string) {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    )
  }

  async function handleStartQuiz() {
    if (selectedModules.length === 0) return
    setIsLoading(true)

    try {
      const result = await createQuizSession({
        subjectId: selectedSubject,
        moduleIds: selectedModules,
        count: questionCount,
        mode: mode,
      })

      // FIX: Use 'in' operator as a type guard
      if ('error' in result) {
        alert(result.error) // Show error from server action
      } else {
        router.push(`/quiz/${result.sessionId}`)
      }

    } catch (error: any) {
      console.error("Quiz creation failed:", error)
      alert("Terjadi kesalahan tak terduga. Silakan coba lagi.") // Show unexpected errors
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Mulai Belajar Baru</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mata Kuliah</label>
          <select className="block w-full rounded-md border border-gray-300 p-2" value={selectedSubject} onChange={handleSubjectChange}>
            <option value="">-- Pilih Mata Kuliah --</option>
            {initialSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori / Sumber</label>
          <select className="block w-full rounded-md border border-gray-300 p-2 disabled:bg-gray-100" value={selectedSource} onChange={handleSourceChange} disabled={!selectedSubject}>
            <option value="">-- Pilih Sumber --</option>
            {sources.map((src) => (<option key={src.id} value={src.id}>{src.name}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Modul / Bab (Bisa Lebih dari 1)</label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50 space-y-2">
            {!selectedSource ? (
              <p className="text-sm text-gray-400 text-center py-2">Pilih Kategori dulu</p>
            ) : modules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">Tidak ada modul</p>
            ) : (
              modules.map((mod) => {
                const isSelected = selectedModules.includes(mod.id)
                return (
                  <div 
                    key={mod.id} 
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-100 border border-transparent'}`}
                  >
                    <div className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-gray-700'}`}>{mod.name}</span>
                  </div>
                )
              })
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{selectedModules.length} Modul terpilih</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Soal</label>
          <input 
            type="number" 
            min={1} 
            max={100} 
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="block w-full rounded-md border border-gray-300 p-2"
          />
          <p className="text-xs text-gray-500 mt-1">Soal akan diambil secara acak dari modul yang dipilih.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={() => setMode('exam')} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium ${mode === 'exam' ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-gray-200 text-gray-600'}`}>
            <Clock className="w-4 h-4 mr-2" /> Mode Ujian
          </button>
          <button onClick={() => setMode('study')} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium ${mode === 'study' ? 'border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600' : 'border-gray-200 text-gray-600'}`}>
            <BookOpen className="w-4 h-4 mr-2" /> Mode Belajar
          </button>
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={selectedModules.length === 0 || isLoading}
          className="w-full flex justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Menyiapkan soal...' : `Mulai Mengerjakan (${questionCount} Soal)`}
        </button>
      </div>
    </div>
  )
}