import { createClient } from '@/utils/supabase/server'
import { getQuizResult } from '@/app/quiz/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, ArrowLeft, RotateCcw, LayoutDashboard, FileText } from 'lucide-react'

// --- 1. IMPORT LIB MATEMATIKA ---
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// --- 2. KOMPONEN RENDER (Sama seperti di QuizInterface) ---
const RenderText = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-indigo max-w-none text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom p agar tidak terlalu renggang di opsi jawaban
          p: ({children}) => <p className="mb-1 inline-block">{children}</p>
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}

export default async function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getQuizResult(sessionId)
  if (!data) return <div className="p-8 text-center">Data hasil tidak ditemukan.</div>

  const { session, reviews } = data

  // --- LOGIC JUDUL CERDAS (Sama seperti Dashboard) ---
  let displayTitle = 'Unknown Title'
  let displaySubtitle = 'Unknown Module'

  if (session.quiz_title) {
    // Kuis Custom: "MK01: Modul A, Modul B"
    const parts = session.quiz_title.split(':')
    if (parts.length >= 2) {
      displayTitle = parts[0].trim() // Kode Matkul
      displaySubtitle = parts[1].trim() // Daftar Modul
    } else {
      displayTitle = 'Kuis Custom'
      displaySubtitle = session.quiz_title
    }
  } else if (session.module) {
    // Kuis Biasa
    displayTitle = session.module.source?.subject?.name || 'Unknown'
    displaySubtitle = session.module.name || 'Unknown'
  }
  // --------------------------------------------------

  const score = session.score ?? 0
  const isPass = score >= 70 // KKM 70

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER SKOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center p-10">
          <h2 className="text-gray-500 font-medium uppercase tracking-widest text-sm mb-2">Hasil Ujian</h2>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayTitle}</h1>
          <p className="text-gray-600 mb-8">{displaySubtitle}</p>

          <div className="flex justify-center mb-8">
            <div className={`
              w-40 h-40 rounded-full flex flex-col items-center justify-center border-8 
              ${isPass ? 'border-green-100 bg-green-50 text-green-600' : 'border-red-100 bg-red-50 text-red-600'}
            `}>
              <span className="text-5xl font-extrabold">{score}</span>
              <span className="text-sm font-semibold mt-1 uppercase">{isPass ? 'Lulus' : 'Belum Lulus'}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Link href="/dashboard" className="flex items-center px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Ke Dashboard
            </Link>
            {/* Tombol Ulangi (hanya visual arahkan ke dashboard karena logic custom quiz butuh parameter) */}
            <Link href="/dashboard" className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
              <RotateCcw className="w-4 h-4 mr-2" />
              Ulangi Ujian
            </Link>
          </div>
        </div>

        {/* DETAIL PEMBAHASAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="font-bold text-gray-700">Pembahasan Detail</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {reviews?.map((item: any, idx: number) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  <div className="shrink-0 mt-1">
                    {item.is_correct ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="grow space-y-3">
                    
                    {/* SOAL (Dengan RenderText Matematika) */}
                    <div className="font-medium text-gray-900 text-lg leading-relaxed">
                      <span className="text-gray-400 mr-2 float-left">{idx + 1}.</span>
                      <RenderText content={item.question.content} />
                    </div>
                    
                    {/* Opsi Jawaban */}
                    <div className="space-y-2 pl-2 border-l-2 border-gray-100 mt-3">
                      {item.question.options.map((opt: any) => {
                        const isSelected = item.selected_option_id === opt.id
                        const isCorrectKey = opt.is_correct
                        
                        let style = "text-gray-500"
                        if (isCorrectKey) style = "text-green-700 font-bold bg-green-50 px-2 py-1 rounded inline-block w-full"
                        else if (isSelected && !isCorrectKey) style = "text-red-600 font-medium line-through decoration-red-400"

                        return (
                          <div key={opt.id} className={`text-sm ${style}`}>
                            <div className="flex items-center">
                                <RenderText content={opt.text} />
                                {isCorrectKey && <span className="ml-2 text-green-600">✓ (Kunci)</span>}
                                {isSelected && !isCorrectKey && <span className="ml-2 text-red-500">✗ (Jawabanmu)</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Kotak Penjelasan (Dengan RenderText Matematika) */}
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100 mt-2">
                      <span className="font-bold block mb-1">💡 Pembahasan:</span>
                      {item.question.explanation ? (
                        <RenderText content={item.question.explanation} />
                      ) : (
                        "Tidak ada pembahasan untuk soal ini."
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}