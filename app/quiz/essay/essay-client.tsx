'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, Send, Loader2, Award, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { gradeEssay } from '@/app/quiz/ai-actions'
import { saveEssayAnswer, submitEssayQuiz } from '@/app/quiz/actions'
import { getClientGeminiKeys, addHistoryLog } from '@/utils/ai-keys'

interface EssayQuestion {
  id: string
  content: string
  explanation: string
  essayAnswer?: string
  aiScore?: number
  aiFeedback?: string
}

interface EssayClientProps {
  sessionId: string
  subjectName: string
  subjectCode: string
  questions: EssayQuestion[]
}

export default function EssayClient({ sessionId, subjectName, subjectCode, questions }: EssayClientProps) {
  const router = useRouter()
  
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Initialize answers from database if resuming
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    questions.forEach(q => {
      if (q.essayAnswer) initial[q.id] = q.essayAnswer
    })
    return initial
  })

  // Initialize results/grades from database if resuming
  const [results, setResults] = useState<Record<string, { score: number; feedback: string; success: boolean }>>(() => {
    const initial: Record<string, { score: number; feedback: string; success: boolean }> = {}
    questions.forEach(q => {
      if (q.aiScore !== null && q.aiScore !== undefined) {
        initial[q.id] = {
          score: q.aiScore,
          feedback: q.aiFeedback || '',
          success: true
        }
      }
    })
    return initial
  })

  const [gradingIds, setGradingIds] = useState<Set<string>>(new Set())

  const activeQuestion = questions[activeIndex]
  const currentAnswer = answers[activeQuestion?.id] || ''
  const currentResult = results[activeQuestion?.id]
  const isGrading = gradingIds.has(activeQuestion?.id)

  const handleGradeAnswer = async () => {
    if (!currentAnswer.trim()) return
    setErrorMsg('')
    
    const qId = activeQuestion.id
    
    // Add to grading set
    setGradingIds(prev => new Set([...prev, qId]))

    try {
      // 1. Panggil AI grading action
      const keys = getClientGeminiKeys()
      const gradeResult = await gradeEssay(activeQuestion.content, activeQuestion.explanation || '', currentAnswer, keys)
      
      if (gradeResult.error) {
        setErrorMsg(gradeResult.error)
        addHistoryLog(
          'gemini-2.5-flash',
          'failed',
          activeQuestion.content.length + currentAnswer.length,
          0,
          gradeResult.error
        )
        return
      }

      if (gradeResult.success) {
        // 2. Simpan hasil penilaian di client state
        setResults(prev => ({
          ...prev,
          [qId]: {
            score: gradeResult.score,
            feedback: gradeResult.feedback || '',
            success: true
          }
        }))

        // 3. Simpan jawaban dan skor ke database di dalam quiz_answers & user_mastery
        await saveEssayAnswer(sessionId, qId, currentAnswer, gradeResult.score, gradeResult.feedback || '')

        // Log success
        if (gradeResult.modelUsed) {
          addHistoryLog(
            gradeResult.modelUsed,
            'success',
            activeQuestion.content.length + currentAnswer.length,
            (gradeResult.feedback || '').length
          )
        }
      }
    } catch (e: any) {
      const errMsg = e.message || 'Terjadi kesalahan koneksi atau server.'
      setErrorMsg(errMsg)
      addHistoryLog(
        'gemini-2.5-flash',
        'failed',
        activeQuestion.content.length + currentAnswer.length,
        0,
        errMsg
      )
    } finally {
      setGradingIds(prev => {
        const next = new Set(prev)
        next.delete(qId)
        return next
      })
    }
  }

  const handleFinishSession = async () => {
    if (!window.confirm('Yakin ingin menyelesaikan latihan essay ini dan melihat skor akhir?')) return
    setIsSubmitting(true)
    try {
      await submitEssayQuiz(sessionId)
      router.push(`/result/${sessionId}`)
    } catch (err) {
      alert('Gagal menyimpan dan menyelesaikan sesi latihan essay.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-55 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">Latihan Soal Essay AI</h1>
            <p className="text-xs text-indigo-650 font-bold uppercase tracking-wider">{subjectCode} • {subjectName}</p>
          </div>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-705">
          Mode AI Grading Active
        </div>
      </header>

      {/* Main Layout */}
      {questions.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Belum Ada Soal Essay</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Mata kuliah ini belum memiliki bank soal essay. Silakan tambahkan file JSON yang memuat soal essay melalui menu Kelola Ujian.
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-250 text-sm font-bold text-slate-700 rounded-xl transition-all shadow-sm"
          >
            Kembali ke Dashboard
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Daftar Soal */}
          <div className="lg:col-span-4 border-r border-slate-200/80 bg-slate-100/30 flex flex-col overflow-y-auto max-h-[40vh] lg:max-h-none p-4 space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2 py-1">Daftar Soal Essay</h3>
            {questions.map((q, idx) => {
              const isActive = idx === activeIndex
              const isGraded = !!results[q.id]
              const score = results[q.id]?.score
              const isMastered = isGraded && score >= 70

              let statusBorder = isActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50'
              if (isGraded) {
                statusBorder = isMastered 
                  ? (isActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50')
                  : (isActive ? 'border-amber-500 bg-amber-50/50' : 'border-amber-250 bg-amber-50/20 hover:bg-emerald-50')
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 relative overflow-hidden group ${statusBorder}`}
                >
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-black border ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-550' 
                      : (isGraded ? (isMastered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-755 border-amber-250') : 'bg-slate-105 text-slate-500 border-slate-200')
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                      {q.content}
                    </p>
                    <span className="text-[10px] text-slate-450 font-semibold block mt-1">
                      {isGraded ? `Ternilai: Skor ${score}` : 'Belum dikerjakan'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Panel: Lembar Kerja & Review */}
          <div className="lg:col-span-8 flex flex-col p-6 overflow-y-auto space-y-6">
            
            {/* Soal Box */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-indigo-55 border-b border-l border-indigo-200 rounded-bl-2xl text-[10px] font-black text-indigo-705 uppercase tracking-widest">
                Soal {activeIndex + 1}
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Pertanyaan Essay
              </h3>
              <div className="prose max-w-none text-slate-800 text-base font-semibold leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {activeQuestion.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Input Jawaban */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Tulis Jawaban Anda</h3>
              <textarea
                value={currentAnswer}
                onChange={(e) => setAnswers(prev => ({ ...prev, [activeQuestion.id]: e.target.value }))}
                disabled={isGrading || !!currentResult}
                placeholder="Tuliskan penjelasan atau jawaban lengkap Anda di sini..."
                className="w-full min-h-[180px] rounded-2xl glass-input p-5 text-sm font-medium resize-y leading-relaxed"
              ></textarea>
            </div>

            {/* Tombol Aksi Soal */}
            <div className="flex items-center gap-3">
              {!currentResult ? (
                <button
                  onClick={handleGradeAnswer}
                  disabled={isGrading || !currentAnswer.trim()}
                  className={`
                    flex items-center justify-center gap-2 px-6 py-3.5 
                    bg-gradient-to-r from-indigo-600 to-violet-600 
                    hover:from-indigo-550 hover:to-violet-550
                    text-white text-sm font-black rounded-2xl shadow-md
                    transition-all duration-300 hover:scale-[1.01] hover:shadow-indigo-500/10
                    disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed
                  `}
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sedang Dinilai oleh AI...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit & Nilai dengan AI
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setResults(prev => {
                      const next = { ...prev }
                      delete next[activeQuestion.id]
                      return next
                    })
                  }}
                  className="px-5 py-3.5 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-xs font-bold text-slate-650 hover:text-slate-800 transition-all rounded-2xl shadow-sm"
                >
                  Coba Jawab Ulang
                </button>
              )}
            </div>

            {/* Area Error */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-750 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-650" />
                <div>
                  <h4 className="font-bold">Gagal Menerima Penilaian</h4>
                  <p className="opacity-80 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* AI Feedback Card */}
            {currentResult && (
              <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-28 rounded-full blur-3xl opacity-5 bg-indigo-500"></div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Score Indicator */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center relative shadow-sm ${
                      currentResult.score >= 70 
                        ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700' 
                        : 'border-amber-100 bg-amber-50/50 text-amber-755'
                    }`}>
                      <span className="text-3xl font-black">{currentResult.score}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-405 -mt-0.5">Skor</span>
                    </div>
                    
                    {currentResult.score >= 70 ? (
                      <span className="mt-3 flex items-center gap-1.5 text-xs font-black text-emerald-750 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mastered
                      </span>
                    ) : (
                      <span className="mt-3 flex items-center gap-1.5 text-xs font-black text-amber-755 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        Coba Lagi
                      </span>
                    )}
                  </div>

                  {/* Feedback Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-655" />
                      <h4 className="text-sm font-black text-slate-900">Review & Masukan AI</h4>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {currentResult.feedback}
                    </p>

                    {/* Acuan Kunci Jawaban */}
                    {activeQuestion.explanation && (
                      <div className="pt-4 border-t border-slate-150">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Jawaban Acuan / Pembahasan</h5>
                        <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 border border-slate-200 p-4 rounded-xl prose max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {activeQuestion.explanation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selesai & Kirim Sesi (Global) */}
            <div className="border-t border-slate-200 pt-6 flex justify-between items-center mt-auto">
              <span className="text-xs text-slate-500 font-bold">
                Progress: {Object.keys(results).length} dari {questions.length} Soal Selesai Dinilai
              </span>
              <button
                onClick={handleFinishSession}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan Sesi...
                  </>
                ) : (
                  <>
                    Selesai & Lihat Skor <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
