import { createClient } from '@/utils/supabase/server'
import { getQuizResult } from '@/app/quiz/actions'
import Link from 'next/link'
import { 
  Trophy, 
  ArrowLeft, 
  Calendar,
  BarChart3
} from 'lucide-react'
import { redirect } from 'next/navigation'
import ScrollToTopButton from '@/components/scroll-to-top' 
import ReviewList from '@/components/review-list' // 👈 Import Komponen Baru

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()

  // 1. Ambil Data Hasil
  const result = await getQuizResult(sessionId)
  
  if (!result) redirect('/dashboard')

  const { session, reviews } = result
  const score = session.score || 0
  const isPassed = score >= 70 // KKM: 70
  
  // Hitung Statistik
  const totalQuestions = reviews?.length || 0
  const correctCount = reviews?.filter(r => r.is_correct).length || 0
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 relative">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* KARTU UTAMA: SKOR & STATUS (TETAP SAMA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center relative">
          <div className={`absolute top-0 left-0 w-full h-2 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <div className="p-8 pb-6">
            <h1 className="text-xl font-bold text-gray-700 mb-1">{session.quiz_title}</h1>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mb-6">
               <Calendar className="w-3 h-3" /> {dateStr} WIB
            </p>

            <div className="flex justify-center items-center mb-6">
               <div className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center border-8 ${isPassed ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                  <span className="text-5xl font-extrabold tracking-tighter">{score}</span>
                  <span className="text-sm font-semibold uppercase mt-1">Nilai Akhir</span>
                  
                  {isPassed && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-2 rounded-full shadow-lg border-2 border-white">
                      <Trophy className="w-6 h-6 fill-white" />
                    </div>
                  )}
               </div>
            </div>

            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isPassed ? 'Lulus Ujian (Passed)' : 'Tidak Lulus (Failed)'}
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-gray-100 divide-x divide-gray-100 bg-gray-50/50">
             <div className="p-4">
               <div className="text-xs text-gray-500 uppercase font-semibold">Total Soal</div>
               <div className="text-lg font-bold text-gray-800">{totalQuestions}</div>
             </div>
             <div className="p-4">
               <div className="text-xs text-green-600 uppercase font-semibold">Benar</div>
               <div className="text-lg font-bold text-green-700">{correctCount}</div>
             </div>
             <div className="p-4">
               <div className="text-xs text-red-600 uppercase font-semibold">Salah</div>
               <div className="text-lg font-bold text-red-700">{wrongCount}</div>
             </div>
          </div>
        </div>

        {/* TOMBOL KEMBALI */}
        <div className="flex gap-4">
           <Link href="/dashboard" className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 flex items-center justify-center transition-all">
             <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
           </Link>
        </div>

{/* PEMBAHASAN DETAIL */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-gray-800 flex items-center">
             <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
             Review Jawaban & Pembahasan
           </h3>
           
           {/* 👇 PERBAIKAN: Tambahkan "|| []" agar tidak null */}
           <ReviewList reviews={reviews || []} />
           
        </div>

      </div>
      
      <ScrollToTopButton />
    </div>
  )
}