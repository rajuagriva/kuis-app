'use client'

import { useState } from 'react'
import { askAIExplanation } from '@/app/quiz/ai-actions'
import { Sparkles } from 'lucide-react'

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

    const result = await askAIExplanation(questionContent, options, correctAnswerText)

    if (result.success) {
      setExplanation(result.explanation || '')
    } else {
      setError(result.error || 'Terjadi kesalahan')
    }

    setIsLoading(false)
  }

  return (
    <div className="ml-12 mt-4">
      <button
        onClick={handleAskAI}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Sedang bertanya pada AI...' : 'Tanya AI kenapa jawaban ini benar'}
      </button>

      {explanation && (
        <div className="mt-3 p-3 text-sm bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900">
          {explanation}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 text-sm bg-red-50 border border-red-200 rounded-lg text-red-900">
          {error}
        </div>
      )}
    </div>
  )
}
