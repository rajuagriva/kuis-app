'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuizSession, getSources, getModules } from '@/app/quiz/actions'
import { BookOpen, Clock, CheckSquare, Square, Loader2 } from 'lucide-react'

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
      // 👇 PERBAIKAN UTAMA DI SINI:
      // Kita pisahkan menjadi 2 argumen: (MODE, CONFIG)
      
const result = await createQuizSession(mode, {
  subjectId: selectedSubject,
  moduleIds: selectedModules, // 👈 Pastikan kirim array ini!
  count: questionCount,
})
      if (result.error) {
        alert(result.error)
      } else if (result.sessionId) {
        router.push(`/quiz/${result.sessionId}`)
      }

    } catch (error: any) {
      console.error("Quiz creation failed:", error)
      alert("Terjadi kesalahan tak terduga. Silakan coba lagi.") 
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200/80 bg-white shadow-sm">
      <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Mulai Latihan Baru</h3>
      
      <div className="space-y-4">
        {/* Pilih Mata Kuliah */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Mata Kuliah</label>
          <select 
            className="block w-full rounded-xl glass-input p-2.5 text-xs font-semibold focus:border-indigo-500 border border-slate-200 outline-none" 
            value={selectedSubject} 
            onChange={handleSubjectChange}
          >
            <option value="">-- Pilih Mata Kuliah --</option>
            {initialSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
            ))}
          </select>
        </div>

        {/* Pilih Sumber */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Kategori / Sumber</label>
          <select 
            className="block w-full rounded-xl glass-input p-2.5 text-xs font-semibold focus:border-indigo-500 border border-slate-200 outline-none disabled:bg-slate-50 disabled:text-slate-400" 
            value={selectedSource} 
            onChange={handleSourceChange} 
            disabled={!selectedSubject}
          >
            <option value="">-- Pilih Sumber --</option>
            {sources.map((src) => (<option key={src.id} value={src.id}>{src.name}</option>))}
          </select>
        </div>

        {/* Pilih Modul (Checklist) */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Pilih Modul / Bab</label>
          <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto bg-slate-50/50 space-y-1.5">
            {!selectedSource ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">Pilih Kategori terlebih dahulu</p>
            ) : modules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">Tidak ada modul</p>
            ) : (
              modules.map((mod) => {
                const isSelected = selectedModules.includes(mod.id)
                return (
                  <div 
                    key={mod.id} 
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200/50' : 'hover:bg-slate-100/50 border border-transparent'}`}
                  >
                    <div className={`mr-2.5 ${isSelected ? 'text-indigo-650' : 'text-slate-400'}`}>
                      {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
                    </div>
                    <span className={`text-xs ${isSelected ? 'font-bold text-indigo-950' : 'text-slate-700 font-medium'}`}>{mod.name}</span>
                  </div>
                )
              })
            )}
          </div>
          <p className="text-[10px] text-slate-450 mt-1 text-right font-semibold">{selectedModules.length} Modul terpilih</p>
        </div>

        {/* Jumlah Soal */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Jumlah Soal</label>
          <input 
            type="number" 
            min={1} 
            max={100} 
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="block w-full rounded-xl glass-input p-2.5 text-xs font-semibold focus:border-indigo-500 border border-slate-200 outline-none"
          />
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button 
            onClick={() => setMode('exam')} 
            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-xs font-bold transition-all ${mode === 'exam' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:text-slate-750 hover:bg-slate-50'}`}
          >
            <Clock className="w-4 h-4 mr-1.5" /> Mode Ujian
          </button>
          <button 
            onClick={() => setMode('study')} 
            className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-xs font-bold transition-all ${mode === 'study' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:text-slate-750 hover:bg-slate-50'}`}
          >
            <BookOpen className="w-4 h-4 mr-1.5" /> Mode Belajar
          </button>
        </div>

        {/* Tombol Start */}
        <button
          onClick={handleStartQuiz}
          disabled={selectedModules.length === 0 || isLoading}
          className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-750 text-xs font-black uppercase tracking-wider text-white shadow-md hover:shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3.5 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyiapkan Soal...
            </>
          ) : (
            `Mulai Latihan (${questionCount} Soal)`
          )}
        </button>
      </div>
    </div>
  )
}