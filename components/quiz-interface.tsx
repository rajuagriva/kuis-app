'use client'

import { useState, useEffect } from 'react'
import { submitQuiz, saveAnswer } from '@/app/quiz/actions'
import { Clock, BookOpen, Flag, Menu, Info, XCircle, CheckCircle2, AlertCircle, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import AskAIButton from '@/components/ask-ai-button'

const RenderText = ({ content }: { content: string }) => (
  <div className="prose max-w-none text-slate-850 font-medium">
    <ReactMarkdown 
      remarkPlugins={[remarkMath]} 
      rehypePlugins={[rehypeKatex]} 
      components={{ p: ({children}) => <p className="mb-2 last:mb-0 inline-block">{children}</p> }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

interface QuizInterfaceProps {
  questions: any[]
  sessionId: string
  mode: 'exam' | 'study' | 'practice'
  initialTime?: number
  initialAnswers?: Record<string, string>
}

export default function QuizInterface({ 
  questions, 
  sessionId, 
  mode,
  initialTime, 
  initialAnswers = {} 
}: QuizInterfaceProps) {
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [timeLeft, setTimeLeft] = useState(initialTime ?? questions.length * 60)

  const currentQuestion = questions[currentIndex]
  const currentAnswerId = answers[currentQuestion.id]

  // Reset showInfo setiap ganti soal
  useEffect(() => {
    setShowInfo(false)
  }, [currentIndex])

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

  async function handleSelectOption(questionId: string, optionId: string) {
    if (mode === 'study' && answers[questionId]) return 
    
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))

    if (mode === 'exam' || mode === 'practice') {
      try {
        await saveAnswer(sessionId, questionId, optionId)
      } catch (err) {
        console.error("Gagal auto-save:", err)
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
    if (idx === currentIndex) return 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
    if (marked.has(q.id)) return 'bg-amber-50 text-amber-700 border-amber-200'
    if (answers[q.id]) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    return 'bg-slate-50 text-slate-500 border-slate-200'
  }

  const correctAnswer = currentQuestion.options.find((o: any) => o.is_correct)
  const isAnswered = !!answers[currentQuestion.id]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 min-h-screen text-slate-800">
      
      {/* HEADER STATUS */}
      <div className="glass-card rounded-2xl p-4 mb-6 sticky top-4 z-20 flex justify-between items-center border border-slate-200/80 bg-white/95 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-650 p-2 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-sm md:text-base">
              Soal {currentIndex + 1} <span className="text-slate-400 font-normal">/ {questions.length}</span>
            </h1>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
              {mode === 'study' ? 'Mode Belajar Santai' : 'Simulasi Ujian'}
            </p>
          </div>
        </div>

        {mode !== 'study' ? (
          <div className={`flex items-center gap-2 font-mono text-base font-black px-4 py-2 rounded-xl border ${
            timeLeft < 300 
              ? 'bg-red-50 text-red-650 border-red-200 animate-pulse' 
              : 'bg-slate-50 text-indigo-650 border-slate-200/60'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
            Tanpa Waktu
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* AREA SOAL */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="glass-card rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 min-h-[380px] flex flex-col relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 rounded-full blur-2xl opacity-10 bg-indigo-300"></div>

            {/* Tombol Info Sumber Soal */}
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`absolute top-4 right-4 p-2.5 rounded-xl border transition-all shadow-sm ${
                showInfo 
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/10' 
                  : 'bg-slate-50 text-indigo-650 border-slate-200/60 hover:bg-slate-100'
              }`}
              title="Lihat Detail Sumber Soal"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Kotak Informasi Detail */}
            {showInfo && (
              <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-150 rounded-2xl text-xs text-slate-600 animate-in fade-in slide-in-from-top-2 shadow-inner space-y-2.5 font-medium">
                <h4 className="font-black text-indigo-650 uppercase tracking-widest text-[9px] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Detail Bank Soal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <p><span className="text-slate-450 font-bold uppercase tracking-wider block text-[8px] mb-0.5">Mata Kuliah:</span>{currentQuestion.module?.source?.subject?.name || '-'}</p>
                  <p><span className="text-slate-450 font-bold uppercase tracking-wider block text-[8px] mb-0.5">Modul:</span>{currentQuestion.module?.name || '-'}</p>
                  <p><span className="text-slate-450 font-bold uppercase tracking-wider block text-[8px] mb-0.5">Nomor Bank:</span>Soal #{currentQuestion.bankNumber}</p>
                </div>
              </div>
            )}

            {/* Teks Pertanyaan */}
            <div className="text-base sm:text-lg text-slate-800 leading-relaxed mb-8 grow pt-3 font-semibold">
              <RenderText content={currentQuestion.content} />
            </div>

            {/* Pilihan Ganda */}
            <div className="space-y-3.5">
              {currentQuestion.options.map((opt: any) => {
                const isSelected = currentAnswerId === opt.id
                
                let optionStyle = "border-slate-200/80 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer text-slate-700"
                let circleStyle = "border-slate-300"

                if (mode === 'study' && isAnswered) {
                  optionStyle = "cursor-default opacity-50 border-slate-100 bg-slate-50/20 text-slate-500"
                  if (opt.is_correct) {
                    optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 opacity-100 shadow-sm shadow-emerald-500/5 font-semibold"
                    circleStyle = "border-emerald-500 bg-emerald-500"
                  } else if (isSelected) {
                    optionStyle = "border-red-500 bg-red-50 text-red-800 opacity-100 shadow-sm shadow-red-500/5 font-semibold"
                    circleStyle = "border-red-500 bg-red-500"
                  }
                } else if (isSelected) {
                  optionStyle = "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold shadow-sm"
                  circleStyle = "border-indigo-600"
                }

                return (
                  <div 
                    key={opt.id} 
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)} 
                    className={`flex items-center p-4.5 rounded-2xl border-2 transition-all duration-200 ${optionStyle}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${circleStyle}`}>
                      {isSelected && (
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          mode === 'study' && isAnswered 
                            ? 'bg-white' 
                            : 'bg-indigo-600'
                        }`} />
                      )}
                      {mode === 'study' && isAnswered && opt.is_correct && !isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-sm sm:text-base leading-relaxed grow"><RenderText content={opt.text} /></div>
                  </div>
                )
              })}
            </div>

            {/* Kunci Jawaban / Penjelasan Instan (Study Mode Only) */}
            {mode === 'study' && isAnswered && currentQuestion.explanation && (
              <div className="mt-8 p-5 bg-indigo-50/50 border border-indigo-150 rounded-2xl animate-in zoom-in-95 duration-300">
                <h4 className="text-xs font-black text-indigo-650 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Penjelasan Pembahasan
                </h4>
                <div className="text-sm text-slate-650 leading-relaxed font-medium">
                  <RenderText content={currentQuestion.explanation} />
                </div>
              </div>
            )}
            
            {/* Ask AI button for explanation */}
            {mode === 'study' && isAnswered && (
              <AskAIButton 
                questionContent={currentQuestion.content} 
                options={currentQuestion.options} 
                correctAnswerText={correctAnswer?.text || ''} 
              />
            )}
          </div>

          {/* NAVIGASI SEBELUM/SESUDAH */}
          <div className="flex justify-between items-center gap-4">
            {mode !== 'study' && (
              <button 
                onClick={toggleMark} 
                className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-300 flex items-center gap-1.5 ${
                  marked.has(currentQuestion.id) 
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' 
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-200/50'
                }`}
              >
                <Flag className="w-4 h-4" />
                Ragu-Ragu
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button 
                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} 
                disabled={currentIndex === 0} 
                className="px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-slate-50 transition-all duration-300 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={() => handleSubmit(false)} 
                  disabled={isSubmitting} 
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.01] transition-all duration-300 flex items-center gap-1.5"
                >
                  Selesai <Check className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))} 
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.01] text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR PETA SOAL (DESKTOP) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="glass-card rounded-3xl border border-slate-200/80 bg-white p-5 sticky top-24 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Peta Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, i: number) => (
                <button 
                  key={q.id} 
                  onClick={() => setCurrentIndex(i)} 
                  className={`h-9 w-full rounded-xl text-xs font-black border transition-all duration-300 ${getNavColor(q, i)}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}