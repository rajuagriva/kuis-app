import { getQuizResult } from '@/app/quiz/actions'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, ArrowLeft, BookOpen } from 'lucide-react'

export default async function QuizResultPage({ 
  params 
}: { 
  params: Promise<{ sessionId: string }> 
}) {
  const { sessionId } = await params
  const result = await getQuizResult(sessionId)

  if (!result) {
    return <div className="p-10 text-center">Data sesi tidak ditemukan atau Anda tidak memiliki akses.</div>
  }

  const { session, reviews } = result
  const score = session.score || 0

  let scoreColor = 'bg-yellow-100 text-yellow-800 border-yellow-200'
  let scoreMessage = 'Cukup Baik'
  if (score >= 70) {
    scoreColor = 'bg-green-100 text-green-800 border-green-200'
    scoreMessage = 'Luar Biasa!'
  } else if (score < 50) {
    scoreColor = 'bg-red-100 text-red-800 border-red-200'
    scoreMessage = 'Perlu Belajar Lagi'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* SCORE CARD */}
        <div className={`rounded-xl border p-8 text-center shadow-sm ${scoreColor}`}>
          <h1 className="text-xl font-semibold uppercase tracking-widest opacity-80">Nilai Akhir</h1>
          <div className="text-6xl font-bold my-4">{score}</div>
          <p className="font-medium text-lg">{scoreMessage}</p>
        </div>

        {/* DAFTAR SOAL & PEMBAHASAN */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-primary" />
            Review Jawaban
          </h2>

          {reviews?.map((review: any, index: number) => {
            const question = review.question
            const options = question.options as any[] 
            const isUserCorrect = review.is_correct

            return (
              <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-6 py-4 border-b flex justify-between items-start ${isUserCorrect ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white border font-bold text-gray-600 text-sm">
                      {index + 1}
                    </span>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${isUserCorrect ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                      {isUserCorrect ? 'Benar' : 'Salah'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-lg text-gray-900 font-medium mb-6">
                    {question.content}
                  </p>

                  <div className="space-y-3 mb-6">
                    {options.map((opt) => {
                      const isSelected = review.selected_option_id === opt.id
                      const isKey = opt.is_correct
                      let optionClass = "border-gray-200 text-gray-600"
                      let icon = null

                      if (isSelected && isKey) {
                        optionClass = "border-green-500 bg-green-50 text-green-800 font-medium ring-1 ring-green-500"
                        icon = <CheckCircle className="w-5 h-5 text-green-600" />
                      } else if (isSelected && !isKey) {
                        optionClass = "border-red-500 bg-red-50 text-red-800 font-medium ring-1 ring-red-500"
                        icon = <XCircle className="w-5 h-5 text-red-600" />
                      } else if (!isSelected && isKey) {
                        optionClass = "border-green-300 bg-green-50/50 text-green-700"
                        icon = <CheckCircle className="w-5 h-5 text-green-400 opacity-50" />
                      }

                      return (
                        <div key={opt.id} className={`flex items-center justify-between p-3 rounded-lg border ${optionClass}`}>
                          <span>{opt.text}</span>
                          {icon}
                        </div>
                      )
                    })}
                  </div>

                  {question.explanation && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center mb-2 text-primary font-semibold text-sm uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Pembahasan
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="sticky bottom-4 z-10">
          <Link 
            href="/dashboard"
            className="flex items-center justify-center w-full md:w-auto md:mx-auto bg-primary hover:opacity-90 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}