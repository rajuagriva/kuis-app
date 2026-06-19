'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Filter, Award } from 'lucide-react'
import AskAIButton from '@/components/ask-ai-button'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const RenderText = ({ content }: { content: string }) => (
  <div className="prose max-w-none text-slate-800 font-medium">
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({children}) => <p className="mb-1 inline">{children}</p> }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

interface ReviewListProps {
  reviews: any[]
  isEssay?: boolean
}

export default function ReviewList({ reviews, isEssay = false }: ReviewListProps) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all')

  const filteredReviews = reviews.filter((item) => {
    if (filter === 'correct') return item.is_correct
    if (filter === 'wrong') return !item.is_correct
    return true
  })

  return (
    <div className="space-y-6">
      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-500 border-r border-slate-200 mr-1">
          <Filter className="w-4 h-4 text-indigo-600" /> Filter:
        </div>
        
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
            filter === 'all' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' 
              : 'bg-slate-50 text-slate-655 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          Semua ({reviews.length})
        </button>

        <button
          onClick={() => setFilter('correct')}
          className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
            filter === 'correct' 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10' 
              : 'bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border border-emerald-200/50'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" /> {isEssay ? 'Mastered (>=70)' : 'Benar'} ({reviews.filter(r => r.is_correct).length})
        </button>

        <button
          onClick={() => setFilter('wrong')}
          className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
            filter === 'wrong' 
              ? 'bg-red-600 text-white shadow-md shadow-red-500/10' 
              : 'bg-red-50/50 text-red-755 hover:bg-red-50 hover:text-red-900 border border-red-200/50'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" /> {isEssay ? 'Coba Lagi (<70)' : 'Salah'} ({reviews.filter(r => !r.is_correct).length})
        </button>
      </div>

      {/* QUESTIONS LIST */}
      <div className="space-y-5">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm bg-white shadow-sm">
            Tidak ada kuis dengan filter ini.
          </div>
        ) : (
          filteredReviews.map((item: any, idx: number) => {
            const originalIndex = reviews.findIndex(r => r.id === item.id) + 1
            const isCorrect = item.is_correct
            const question = item.question
            const userAnswerId = item.selected_option_id
            const userOption = question.options?.find((o: any) => o.id === userAnswerId)
            const correctOption = question.options?.find((o: any) => o.is_correct)

            return (
              <div 
                key={item.id} 
                className={`glass-card rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden ${
                  isCorrect 
                    ? 'border-slate-200 hover:border-indigo-200 shadow-sm' 
                    : 'border-red-200 bg-red-50/10 hover:border-red-300 shadow-sm'
                }`}
              >
                {/* Header Soal */}
                <div className="flex gap-4 mb-5">
                  <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border ${
                    isCorrect 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-red-50 text-red-755 border-red-250'
                  }`}>
                    {originalIndex}
                  </div>
                  <div className="grow pt-1 text-sm sm:text-base leading-relaxed text-slate-800 font-semibold">
                    <RenderText content={question.content} />
                  </div>
                </div>

                {/* Hasil Pilihan / Essay Answer */}
                <div className="sm:ml-12 space-y-3">
                  {isEssay ? (
                    <>
                      {/* Essay Answer */}
                      <div className="flex items-start gap-3 p-4 rounded-2xl border bg-slate-50 border-slate-200">
                        <div className="w-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70 text-slate-500">Jawaban Anda:</span>
                          <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {item.essay_answer || <span className="italic text-slate-400">(Tidak Dijawab)</span>}
                          </p>
                        </div>
                      </div>

                      {/* AI Feedback & Score */}
                      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
                        isCorrect 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-amber-55 border-amber-200 text-amber-800'
                      }`}>
                        <Award className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                            Penilaian AI: Skor {item.ai_score ?? 0}
                          </span>
                          <p className="text-sm font-semibold leading-relaxed text-slate-800">
                            {item.ai_feedback || <span className="italic text-slate-400">(Tidak ada feedback dari AI)</span>}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* MCQ Answer */}
                      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
                        isCorrect 
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-805' 
                          : 'bg-red-50/55 border-red-200 text-red-805'
                      }`}>
                        {isCorrect 
                          ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> 
                          : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        }
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">Jawaban Anda:</span>
                          <span className="text-sm font-bold leading-relaxed text-slate-800">
                            {userOption ? <RenderText content={userOption.text} /> : <span className="italic text-slate-500">(Tidak Dijawab)</span>}
                          </span>
                        </div>
                      </div>

                      {!isCorrect && correctOption && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/55 border border-indigo-200 text-indigo-700">
                          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">Kunci Jawaban:</span>
                            <span className="text-sm font-bold leading-relaxed text-slate-850">
                              <RenderText content={correctOption.text} />
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Pembahasan */}
                {question.explanation && (
                  <div className="sm:ml-12 mt-5 pt-5 border-t border-slate-200">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-650" />
                      {isEssay ? 'Jawaban Acuan / Pembahasan' : 'Pembahasan Soal'}
                    </h5>
                    <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <RenderText content={question.explanation} />
                    </div>
                  </div>
                )}

                {!isEssay && (
                  <div className="sm:ml-12">
                    <AskAIButton
                      questionContent={question.content}
                      options={question.options}
                      correctAnswerText={correctOption?.text || ''}
                      userAnswerText={userOption?.text || ''}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}