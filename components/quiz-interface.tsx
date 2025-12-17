'use client'

import { useState, useEffect } from 'react'
import { submitQuiz, saveAnswer } from '@/app/quiz/actions' // Kita akan buat saveAnswer nanti
import { 
  Clock, BookOpen, CheckCircle, XCircle, AlertCircle, 
  Flag, Menu, X, ChevronLeft, ChevronRight, Save, WifiOff
} from 'lucide-react'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const RenderText = ({ content }: { content: string }) => (
  <div className="prose prose-indigo max-w-none text-gray-800">
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({children}) => <p className="mb-2 last:mb-0 inline-block">{children}</p> }}>{content}</ReactMarkdown>
  </div>
)

interface QuizInterfaceProps {
  questions: any[]
  sessionId: string
  mode: 'exam' | 'study'
  initialTime?: number       // Props baru
  initialAnswers?: Record<string, string> // Props baru
}

export default function QuizInterface({ 
  questions, 
  sessionId, 
  mode,
  initialTime, 
  initialAnswers = {} 
}: QuizInterfaceProps) {
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers) // Load jawaban lama
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Indikator auto-save
  
  // Timer: Gunakan initialTime dari server, atau default hitung manual
  const [timeLeft, setTimeLeft] = useState(initialTime ?? questions.length * 60)

  const currentQuestion = questions[currentIndex]
  const currentAnswerId = answers[currentQuestion.id]

  // Timer Logic
  useEffect(() => {
    if (mode === 'study') return
    if (timeLeft <= 0) { handleSubmit(true); return }
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, mode])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  // HANDLE JAWABAN + AUTO SAVE (Real-time)
  async function handleSelectOption(questionId: string, optionId: string) {
    if (mode === 'study' && answers[questionId]) return 
    
    // 1. Update UI Lokal (Cepat)
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))

    // 2. Simpan ke Server (Background)
    if (mode === 'exam') {
      setIsSaving(true)
      try {
        await saveAnswer(sessionId, questionId, optionId)
      } catch (err) {
        console.error("Gagal auto-save:", err)
      } finally {
        setIsSaving(false)
      }
    }
  }

  function toggleMark() {
    const newMarked = new Set(marked)
    newMarked.has(currentQuestion.id) ? newMarked.delete(currentQuestion.id) : newMarked.add(currentQuestion.id)
    setMarked(newMarked)
  }

  async function handleSubmit(autoSubmit = false) {
    if (!autoSubmit && !window.confirm('Yakin ingin mengumpulkan ujian?')) return
    setIsSubmitting(true)
    try {
      await submitQuiz(sessionId, answers)
      window.location.href = `/result/${sessionId}`
    } catch (error) {
      alert('Gagal submit. Cek koneksi internet.')
      setIsSubmitting(false)
    }
  }

  const getNavColor = (q: any, idx: number) => {
    if (idx === currentIndex) return 'bg-indigo-600 text-white border-indigo-600'
    if (marked.has(q.id)) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    if (answers[q.id]) return 'bg-green-600 text-white border-green-600'
    return 'bg-white text-gray-500 border-gray-200'
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 sticky top-4 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <button onClick={() => setShowMobileNav(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Menu className="w-5 h-5" /></button>
           <div>
             <h1 className="font-bold text-gray-800 text-sm md:text-base">Soal {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></h1>
             {/* Indikator Auto Save */}
             {mode === 'exam' && (
               <div className="text-[10px] flex items-center mt-1">
                 {isSaving ? <span className="text-orange-500 animate-pulse">Menyimpan...</span> : <span className="text-gray-400">Tersimpan</span>}
               </div>
             )}
           </div>
        </div>

        {mode === 'exam' ? (
          <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50 text-indigo-600'}`}>
            <Clock className="w-5 h-5" /><span>{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div className="flex items-center text-gray-400 text-sm"><BookOpen className="w-4 h-4 mr-2" /> Santai</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* AREA SOAL */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px] flex flex-col">
            <div className="text-base md:text-lg text-gray-900 leading-relaxed mb-8 grow"><RenderText content={currentQuestion.content} /></div>
            <div className="space-y-3">
              {currentQuestion.options.map((opt: any) => {
                const isSelected = currentAnswerId === opt.id
                let style = "border-gray-200 hover:bg-gray-50 cursor-pointer"
                if (mode === 'study' && answers[currentQuestion.id]) {
                   style = "cursor-default opacity-60"
                   if (opt.is_correct) style = "border-green-500 bg-green-50 opacity-100"
                   else if (isSelected) style = "border-red-500 bg-red-50 opacity-100"
                } else if (isSelected) style = "border-indigo-600 bg-indigo-50"

                return (
                  <div key={opt.id} onClick={() => handleSelectOption(currentQuestion.id, opt.id)} className={`flex items-center p-4 rounded-xl border-2 transition-all ${style}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 ${isSelected ? 'border-indigo-600' : 'border-gray-300'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                    </div>
                    <div className="text-gray-700 text-sm md:text-base grow"><RenderText content={opt.text} /></div>
                  </div>
                )
              })}
            </div>
            {mode === 'study' && answers[currentQuestion.id] && currentQuestion.explanation && (
               <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5"><RenderText content={currentQuestion.explanation} /></div>
            )}
          </div>

          {/* TOMBOL NAVIGASI */}
          <div className="flex justify-between items-center gap-4">
             {mode === 'exam' && <button onClick={toggleMark} className={`px-4 py-2.5 rounded-lg text-sm font-bold border ${marked.has(currentQuestion.id) ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-500'}`}><Flag className="w-4 h-4 mr-2 inline" />Ragu</button>}
             <div className="flex gap-3 ml-auto">
                <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex===0} className="px-5 py-2.5 rounded-lg border font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Prev</button>
                {currentIndex === questions.length - 1 ? 
                  <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md">Selesai</button> : 
                  <button onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))} className="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800">Next</button>
                }
             </div>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit sticky top-24">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Peta Soal</h3>
           <div className="grid grid-cols-5 gap-2">
             {questions.map((q: any, i: number) => (
               <button key={q.id} onClick={() => setCurrentIndex(i)} className={`h-9 w-9 rounded-lg text-xs font-bold border ${getNavColor(q, i)}`}>{i + 1}</button>
             ))}
           </div>
        </div>
      </div>
    </div>
  )
}