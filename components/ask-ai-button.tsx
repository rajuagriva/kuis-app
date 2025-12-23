'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Bot, ChevronRight, XCircle } from 'lucide-react'
import { askAIExplanation } from '@/app/quiz/ai-actions'
import MarkdownRenderer from '@/components/markdown-renderer'

interface AskAIButtonProps {
  questionContent: string
  options: any[]
  correctAnswerText: string
}

export default function AskAIButton({ questionContent, options, correctAnswerText }: AskAIButtonProps) {
  const [explanation, setExplanation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAskAI = async () => {
    setIsLoading(true)
    setError('')
    setExplanation('')

    try {
      const result = await askAIExplanation(questionContent, options, correctAnswerText)

      if (result.success) {
        setExplanation(result.explanation || '')
      } else {
        setError(result.error || 'Terjadi kesalahan pada AI.')
      }
    } catch (err) {
      setError('Gagal menghubungi server.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-6 w-full max-w-3xl">
      {/* 1. TOMBOL UTAMA */}
      {!explanation && !error && (
        <button
          onClick={handleAskAI}
          disabled={isLoading}
          className={`
            group relative flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-4 
            bg-gradient-to-r from-indigo-600 to-violet-600 
            text-white text-base font-bold rounded-xl shadow-lg shadow-indigo-200
            transition-all duration-300 
            hover:shadow-xl hover:scale-[1.02] hover:shadow-indigo-300
            disabled:opacity-80 disabled:cursor-wait
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-indigo-200" />
              <span className="text-indigo-50">Sedang Menganalisis Jawaban...</span>
            </>
          ) : (
            <>
              <div className="p-1 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              </div>
              <span>Tanya AI: Kenapa Jawabannya Ini?</span>
              <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      )}

      {/* 2. AREA ERROR (Jika Gagal) */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Gagal Memuat</h4>
            <p className="text-sm opacity-90">{error}</p>
            <button 
              onClick={handleAskAI} 
              className="mt-2 text-xs font-bold underline hover:text-red-900"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* 3. KARTU PENJELASAN (Hasil AI) */}
      {explanation && (
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/5 animate-in zoom-in-95 duration-300">
          
          {/* Header Kartu */}
          <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
               <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Penjelasan AI Tutor</h3>
              <p className="text-xs text-slate-500 font-medium">Powered by Llama 3 (Groq)</p>
            </div>
          </div>
          
          {/* Isi Konten (High Contrast Text) */}
          <div className="p-6 bg-white">
            <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-800 leading-relaxed">
              <MarkdownRenderer content={explanation} />
            </div>
          </div>

          {/* Footer Kartu (Opsional) */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-400">Semoga membantu belajarmu! 🚀</span>
            <button 
              onClick={() => setExplanation('')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Tutup Penjelasan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}