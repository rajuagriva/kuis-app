'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react'
import AskAIButton from '@/components/ask-ai-button'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Helper Render Teks (Kita pindahkan ke sini karena dipakai di Client)
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

export default function ReviewList({ reviews }: { reviews: any[] }) {
  // State untuk Filter: 'all' | 'correct' | 'wrong'
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all')

  // Logika Filter Data
  const filteredReviews = reviews.filter((item) => {
    if (filter === 'correct') return item.is_correct
    if (filter === 'wrong') return !item.is_correct
    return true // 'all'
  })

  return (
    <div className="space-y-6">
      {/* --- TOMBOL FILTER --- */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 text-sm font-bold text-gray-500 border-r border-gray-200 mr-1">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            filter === 'all' 
              ? 'bg-gray-800 text-white shadow-md' 
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Semua ({reviews.length})
        </button>

        <button
          onClick={() => setFilter('correct')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            filter === 'correct' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> Benar ({reviews.filter(r => r.is_correct).length})
        </button>

        <button
          onClick={() => setFilter('wrong')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            filter === 'wrong' 
              ? 'bg-red-600 text-white shadow-md' 
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <XCircle className="w-4 h-4" /> Salah ({reviews.filter(r => !r.is_correct).length})
        </button>
      </div>

      {/* --- DAFTAR SOAL (HASIL FILTER) --- */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
           <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
             Tidak ada soal dengan filter ini.
           </div>
        ) : (
          filteredReviews.map((item: any, idx: number) => {
            // Kita cari index asli dari array utama agar nomor soal tidak acak saat difilter
            const originalIndex = reviews.findIndex(r => r.id === item.id) + 1

            const isCorrect = item.is_correct
            const question = item.question
            const userAnswerId = item.selected_option_id
            const userOption = question.options.find((o: any) => o.id === userAnswerId)
            const correctOption = question.options.find((o: any) => o.is_correct)

            return (
              <div key={item.id} className={`bg-white rounded-xl border p-5 transition-all animate-in fade-in slide-in-from-bottom-2 ${isCorrect ? 'border-gray-200' : 'border-red-200 shadow-sm'}`}>
                {/* Header Soal */}
                <div className="flex gap-4 mb-4">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {originalIndex}
                  </div>
                  <div className="grow">
                    <div className="text-gray-900 font-medium">
                        <RenderText content={question.content} />
                    </div>
                  </div>
                </div>

                {/* Opsi Jawaban */}
                <div className="ml-12 space-y-2 text-sm">
                  <div className={`flex items-start gap-2 p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                      <div>
                        <span className="text-xs font-bold uppercase opacity-70 block mb-1">Jawaban Anda:</span>
                        <span className={isCorrect ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                          {userOption ? <RenderText content={userOption.text} /> : '(Tidak Dijawab)'}
                        </span>
                      </div>
                  </div>

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

                <AskAIButton
                  questionContent={question.content}
                  options={question.options}
                  correctAnswerText={correctOption?.text || ''}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}