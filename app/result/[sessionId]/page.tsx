import { createClient } from '@/utils/supabase/server'
import { getQuizResult } from '@/app/quiz/actions'
import Link from 'next/link'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Trophy, 
  ArrowLeft, 
  RotateCcw, 
  Calendar,
  BarChart3
} from 'lucide-react'
import { redirect } from 'next/navigation'
import AskAIButton from '@/components/ask-ai-button'

// --- LIB MATEMATIKA (Untuk Render Pembahasan) ---
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Helper Render Teks
const RenderText = ({ content }: { content: string }) => (
  <div className="prose prose-sm max-w-none text-gray-700">
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({children}) => <p className="mb-1 inline">{children}</p> }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()

  // 1. Ambil Data Hasil
  const result = await getQuizResult(sessionId)
  
  // Jika tidak ditemukan atau bukan milik user login, tendang ke dashboard
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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* KARTU UTAMA: SKOR & STATUS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center relative">
          {/* Hiasan Background */}
          <div className={`absolute top-0 left-0 w-full h-2 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <div className="p-8 pb-6">
            <h1 className="text-xl font-bold text-gray-700 mb-1">{session.quiz_title}</h1>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mb-6">
               <Calendar className="w-3 h-3" /> {dateStr}
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

          {/* Statistik Grid */}
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

        {/* TOMBOL AKSI */}
        <div className="flex gap-4">
           <Link href="/dashboard" className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 flex items-center justify-center transition-all">
             <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
           </Link>
           {/* Tombol Ulangi (Hanya jika latihan matkul, jika custom mungkin perlu logic lain) */}
           <Link href="/dashboard" className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg flex items-center justify-center transition-all">
             <RotateCcw className="w-4 h-4 mr-2" /> Ulangi Ujian Baru
           </Link>
        </div>

        {/* PEMBAHASAN DETAIL */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-gray-800 flex items-center">
             <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
             Review Jawaban & Pembahasan
           </h3>
           
           {reviews?.map((item: any, idx: number) => {
             // Cek apakah benar
             const isCorrect = item.is_correct
             const question = item.question
             const userAnswerId = item.selected_option_id
             
             // Cari teks jawaban user & kunci jawaban
             const userOption = question.options.find((o: any) => o.id === userAnswerId)
             const correctOption = question.options.find((o: any) => o.is_correct)

             return (
               <div key={item.id} className={`bg-white rounded-xl border p-5 transition-all ${isCorrect ? 'border-gray-200' : 'border-red-200 shadow-sm'}`}>
                 {/* Header Soal */}
                 <div className="flex gap-4 mb-4">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {idx + 1}
                    </div>
                    <div className="grow">
                      <div className="text-gray-900 font-medium">
                         <RenderText content={question.content} />
                      </div>
                    </div>
                 </div>

                 {/* Opsi Jawaban User vs Kunci */}
                 <div className="ml-12 space-y-2 text-sm">
                    {/* Jawaban User */}
                    <div className={`flex items-start gap-2 p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                       {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                       <div>
                         <span className="text-xs font-bold uppercase opacity-70 block mb-1">Jawaban Anda:</span>
                         <span className={isCorrect ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                            {userOption ? <RenderText content={userOption.text} /> : '(Tidak Dijawab)'}
                         </span>
                       </div>
                    </div>

                    {/* Kunci Jawaban (Hanya muncul jika salah) */}
                    {!isCorrect && correctOption && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                         <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                         <div>
                           <span className="text-xs font-bold uppercase text-blue-600 opacity-70 block mb-1">Kunci Jawaban:</span>
                           <span className="text-gray-800 font-medium">
                              <RenderText content={correctOption.text} />
                           </span>
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Pembahasan */}
                 {question.explanation && (
                   <div className="ml-12 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-2">
                        <AlertCircle className="w-4 h-4" /> Pembahasan:
                      </div>
                      <div className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                        <RenderText content={question.explanation} />
                      </div>
                   </div>
                 )}

                 {/* Tombol Tanya AI */}
                  <AskAIButton
                    questionContent={question.content}
                    options={question.options}
                    correctAnswerText={correctOption?.text || ''}
                  />

               </div>
             )
           })}
        </div>

      </div>
    </div>
  )
}