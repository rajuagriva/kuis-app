import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import QuizInterface from '@/components/quiz-interface'

// Perhatikan: params sekarang menggunakan 'id'
export default async function QuizSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // 'id' ini adalah Session ID
  const supabase = await createClient()

  // 1. Cek User & Sesi
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Ambil Data Sesi
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session || session.user_id !== user.id) {
    redirect('/dashboard')
  }

  // Jika sudah selesai, lempar ke result
  if (session.status === 'completed') {
    redirect(`/result/${id}`)
  }

  // 3. Ambil Soal & Jawaban
  const { data: answersData } = await supabase
    .from('quiz_answers')
    .select(`
      id, question_id, selected_option_id, status,
      question:questions (
        id, content, explanation, 
        options (id, text, is_correct)
      )
    `)
    .eq('session_id', id)
    .order('order_number')

  if (!answersData || answersData.length === 0) {
    return <div className="p-10 text-center">Gagal memuat soal.</div>
  }

  // Format Data Resume
  const savedAnswers: Record<string, string> = {}
  const questions = answersData.map((item: any) => {
    if (item.selected_option_id) {
      savedAnswers[item.question.id] = item.selected_option_id
    }
    return {
      id: item.question.id,
      content: item.question.content,
      explanation: item.question.explanation,
      options: item.question.options
    }
  })

  // 4. Hitung Sisa Waktu
  const startTime = new Date(session.started_at).getTime()
  const now = new Date().getTime()
  const totalDurationSeconds = questions.length * 60 
  const elapsedSeconds = Math.floor((now - startTime) / 1000)
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds)

  return (
    <div className="min-h-screen bg-gray-50">
       <QuizInterface 
          questions={questions} 
          sessionId={id}
          mode={session.mode}
          initialTime={remainingSeconds}
          initialAnswers={savedAnswers}
       />
    </div>
  )
}