import { createClient } from '@/utils/supabase/server'
import { getQuizResult } from '@/app/quiz/actions'
import Link from 'next/link'
import { Trophy, ArrowLeft, Calendar, BarChart3, CheckCircle2, XCircle, Clock, BookOpen, Sparkles, Award } from 'lucide-react'
import { redirect } from 'next/navigation'
import ScrollToTopButton from '@/components/scroll-to-top' 
import ReviewList from '@/components/review-list'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  // 1. Ambil Data Hasil
  const result = await getQuizResult(sessionId)
  
  if (!result) redirect('/dashboard')

  const { session, reviews } = result
  const score = session.score || 0
  const isPassed = score >= 70 // KKM: 70
  const isEssay = session.mode === 'essay'
  
  // Hitung Statistik
  const totalQuestions = reviews?.length || 0
  const correctCount = reviews ? reviews.filter((r: any) => r.is_correct).length : 0
  const wrongCount = totalQuestions - correctCount

  // Format Tanggal
  const dateStr = new Date(session.created_at).toLocaleDateString('id-ID', {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Jakarta' 
  })

  // SVG Gauge calculations
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 relative overflow-hidden" suppressHydrationWarning>
      
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[130px] opacity-10 bg-gradient-to-tr from-indigo-300 to-violet-300 animate-pulse-soft"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[130px] opacity-10 bg-gradient-to-tr from-violet-300 to-pink-300 animate-pulse-soft"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* KARTU UTAMA: RINGKASAN SKOR & GAUGES */}
        <div className="glass-card rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden bg-white/80 backdrop-blur-md relative transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5">
          <div className={`absolute top-0 left-0 w-full h-2.5 ${isPassed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-red-400 to-amber-500'}`} />
          
          <div className="p-8 md:p-10 text-center">
            
            {/* Header info */}
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-650 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full inline-block mb-3">
              {isEssay ? 'Latihan Essay AI' : 'Latihan Pilihan Ganda'}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              {session.quiz_title || 'Hasil Sesi Ujian'}
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-semibold mb-8">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Dikerjakan pada: {dateStr} WIB</span>
            </div>

            {/* Circular Gauge Score */}
            <div className="flex justify-center items-center mb-8 relative">
              <div className="relative flex items-center justify-center">
                <svg className="w-48 h-48 transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    className="stroke-slate-100"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress Circle with Gradient */}
                  <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke={`url(#gaugeGradient-${sessionId})`}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id={`gaugeGradient-${sessionId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      {isPassed ? (
                        <>
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#d97706" />
                        </>
                      )}
                    </linearGradient>
                  </defs>
                </svg>

                {/* Score Text inside Circle */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black tracking-tighter text-slate-900">{score}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Nilai</span>
                </div>

                {/* Trophy/Badge Icon on Top Right */}
                {isPassed && (
                  <div className="absolute top-2 right-2 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white p-3 rounded-2xl shadow-lg border-2 border-white animate-bounce-soft">
                    <Trophy className="w-5 h-5 fill-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge & Motivation */}
            <div className="space-y-3 max-w-md mx-auto">
              <div className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-black tracking-wider uppercase border shadow-sm ${
                isPassed 
                  ? 'bg-emerald-50 text-emerald-750 border-emerald-200 shadow-emerald-100/30' 
                  : 'bg-red-50 text-red-755 border-red-200 shadow-red-100/30'
              }`}>
                {isPassed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Lulus Batas KKM (Passed)
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-555" />
                    Coba Lagi (Failed)
                  </>
                )}
              </div>
              <p className="text-sm text-slate-550 leading-relaxed font-medium">
                {isPassed 
                  ? 'Selamat! Hasil evaluasi menunjukkan pemahaman Anda telah melampaui ambang batas kompetensi minimum (KKM 70).' 
                  : 'Tetap semangat! Nilai Anda belum memenuhi batas kompetensi minimum. Silakan tinjau kembali pembahasan di bawah ini untuk belajar.'
                }
              </p>
            </div>

          </div>

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-150 bg-slate-50/50 text-center divide-x divide-slate-150">
            <div className="p-5 flex flex-col items-center justify-center space-y-1">
              <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Total Soal</span>
              <span className="text-lg font-black text-slate-800">{totalQuestions}</span>
            </div>
            
            <div className="p-5 flex flex-col items-center justify-center space-y-1">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                {isEssay ? 'Mastered (>=70)' : 'Jawaban Benar'}
              </span>
              <span className="text-lg font-black text-emerald-700">{correctCount}</span>
            </div>

            <div className="p-5 flex flex-col items-center justify-center space-y-1">
              <div className="p-2 bg-red-50 text-red-655 rounded-xl">
                <XCircle className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                {isEssay ? 'Coba Lagi (<70)' : 'Jawaban Salah'}
              </span>
              <span className="text-lg font-black text-red-655">{wrongCount}</span>
            </div>

            <div className="p-5 flex flex-col items-center justify-center space-y-1">
              <div className="p-2 bg-violet-50 text-violet-650 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Akurasi AI</span>
              <span className="text-lg font-black text-violet-750">
                {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* PEMBAHASAN DETAIL */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Review Jawaban & Pembahasan
            </h3>
            
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-650 hover:text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.01]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali Ke Dashboard
            </Link>
          </div>
          
          {/* List of answers */}
          <ReviewList reviews={reviews || []} isEssay={isEssay} />
        </div>

      </div>
      
      <ScrollToTopButton />
    </div>
  )
}