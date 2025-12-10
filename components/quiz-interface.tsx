'use client'

import { useState, useEffect } from 'react'
import { submitQuiz } from '@/app/quiz/actions'
import { Clock, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Option {
  id: string
  text: string
  is_correct?: boolean // Optional, hanya ada di mode study
}

interface Question {
  id: string
  content: string
  explanation?: string // Optional, hanya ada di mode study
  options: Option[]
}

interface QuizInterfaceProps {
  questions: Question[]
  sessionId: string
  mode: 'exam' | 'study'
}

export default function QuizInterface({ questions, sessionId, mode }: QuizInterfaceProps) {
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(questions.length * 40)

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  
  // Helper: Cek apakah soal ini sudah dijawab (untuk menampilkan pembahasan di mode study)
  const currentAnswerId = answers[currentQuestion.id]
  const isAnswered = !!currentAnswerId

  // Effect: Timer (Hanya jalan di Mode Exam)
  useEffect(() => {
    if (mode === 'study') return // Timer mati di mode study

    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, mode])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function handleSelectOption(questionId: string, optionId: string) {
    // Di mode study, jika sudah dijawab, tidak boleh ganti lagi (biar fokus belajar)
    if (mode === 'study' && answers[questionId]) return

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await submitQuiz(sessionId, answers)
      // Redirect ke halaman Result
      window.location.href = `/result/${sessionId}`
    } catch (error) {
      alert('Gagal mengumpulkan jawaban. Coba lagi.')
      setIsSubmitting(false)
    }
  }

  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center text-red-500">Soal tidak ditemukan.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center sticky top-4 z-10 border border-gray-200">
        <div className="flex items-center space-x-2 text-gray-700">
          <span className="font-bold text-lg">Soal {currentIndex + 1} / {totalQuestions}</span>
          {mode === 'study' && (
             <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase">Mode Belajar</span>
          )}
        </div>
        
        {/* Tampilan Waktu / Mode */}
        {mode === 'exam' ? (
          <div className={`flex items-center space-x-2 font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-primary'}`}>
            <Clock className="w-5 h-5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div className="text-gray-500 flex items-center text-sm font-medium">
            <BookOpen className="w-4 h-4 mr-2" />
            Santai, tidak ada waktu
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Area Soal */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            {/* Teks Soal */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 leading-relaxed">
                {currentQuestion.content}
              </h2>
            </div>

            {/* Pilihan Jawaban */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswerId === option.id
                
                // --- LOGIKA WARNA (MODE BELAJAR) ---
                let containerClass = "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                let circleClass = "border-gray-400"
                let icon = null

                if (mode === 'study' && isAnswered) {
                  // Jika User Sudah Jawab, kita kunci tampilan (cursor-default)
                  containerClass = "cursor-default" 

                  if (option.is_correct) {
                    // Ini Jawaban Benar (Selalu hijaukan, entah dipilih user atau tidak)
                    containerClass = "border-green-500 bg-green-50 ring-1 ring-green-500"
                    circleClass = "border-green-500 bg-green-500"
                    icon = <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                  } 
                  else if (isSelected && !option.is_correct) {
                     // Ini Jawaban Salah yang dipilih User (Merahkan)
                    containerClass = "border-red-500 bg-red-50 ring-1 ring-red-500"
                    circleClass = "border-red-500 bg-red-500"
                    icon = <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                  }
                  else {
                    // Opsi lain (netral) saat sudah dijawab
                    containerClass = "border-gray-100 opacity-50"
                  }
                } 
                // --- LOGIKA WARNA (MODE UJIAN) ---
                else if (isSelected) {
                   containerClass = "border-primary bg-gray-50"
                   circleClass = "border-primary bg-primary"
                }

                return (
                  <div 
                    key={option.id}
                    onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                    className={`relative flex items-center p-4 rounded-lg border-2 transition-all ${containerClass}`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 shrink-0 ${circleClass}`}>
                      {/* Titik putih di tengah jika selected atau benar */}
                      {(isSelected || (mode === 'study' && isAnswered && option.is_correct)) && 
                        <div className="w-2 h-2 bg-white rounded-full" />
                      }
                    </div>
                    <span className="text-gray-800 grow">{option.text}</span>
                    {icon}
                  </div>
                )
              })}
            </div>

            {/* --- KOTAK PEMBAHASAN (Hanya Mode Study & Sudah Dijawab) --- */}
            {mode === 'study' && isAnswered && currentQuestion.explanation && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center mb-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Pembahasan
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Tombol Navigasi */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0 || isSubmitting}
              className="px-6 py-2 rounded-md bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              Sebelumnya
            </button>

            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-2 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-70 flex items-center space-x-2"
              >
                {isSubmitting ? 'Mengumpulkan...' : 'Selesai & Simpan'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-6 py-2 rounded-md bg-primary text-white font-medium hover:opacity-90"
              >
                Selanjutnya
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Navigasi */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Navigasi Soal</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAns = !!answers[q.id]
                const isActive = idx === currentIndex
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`
                      h-10 w-10 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors
                      ${isActive ? 'bg-primary text-white ring-2 ring-offset-1 ring-primary' : ''}
                      ${!isActive && isAns ? 'bg-green-100 text-green-700 border border-green-200' : ''}
                      ${!isActive && !isAns ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : ''}
                    `}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}