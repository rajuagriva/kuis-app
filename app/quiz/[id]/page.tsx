import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import QuizInterface from '@/components/quiz-interface'

export default async function QuizSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  if (session.status === 'completed') {
    redirect(`/result/${id}`)
  }

  // ============================================================
  // 3. AMBIL SOAL & JAWABAN (UPDATE: Tambah module_id & created_at)
  // ============================================================
  const { data: answersData } = await supabase
    .from('quiz_answers')
    .select(`
      id, question_id, selected_option_id, status,
      question:questions (
        id, content, explanation, 
        module_id, created_at,
        module:modules (
          name,
          source:sources (
            subject:subjects (
              name
            )
          )
        ),
        options (id, text, is_correct)
      )
    `)
    .eq('session_id', id)
    .order('order', { ascending: true }) 

  if (!answersData || answersData.length === 0) {
    return <div className="p-10 text-center">Gagal memuat soal.</div>
  }

  // ============================================================
  // 4. LOGIKA BARU: HITUNG NOMOR URUT BANK SOAL (Disini Kurangnya Tadi)
  // ============================================================
  
  // A. Kumpulkan semua ID Modul yang terlibat dalam kuis ini
  const moduleIds = [...new Set(answersData.map((a: any) => a.question.module_id))]
  
  // B. Ambil SEMUA soal dari modul-modul tersebut (diurutkan created_at ASC seperti Admin)
  const { data: allModuleQuestions } = await supabase
    .from('questions')
    .select('id, module_id, created_at')
    .in('module_id', moduleIds)
    .order('created_at', { ascending: true })

  // C. Buat Kamus Nomor Urut
  const bankNumberMap: Record<string, number> = {}
  const moduleCounters: Record<string, number> = {}

  allModuleQuestions?.forEach((q: any) => {
     if (!moduleCounters[q.module_id]) moduleCounters[q.module_id] = 0
     moduleCounters[q.module_id]++ // 1, 2, 3...
     
     bankNumberMap[q.id] = moduleCounters[q.module_id]
  })

  // ============================================================
  // 5. FORMAT DATA RESUME
  // ============================================================
  const savedAnswers: Record<string, string> = {}
  
  const questions = answersData.map((item: any) => {
    if (item.selected_option_id) {
      savedAnswers[item.question.id] = item.selected_option_id
    }
    return {
      id: item.question.id,
      content: item.question.content,
      explanation: item.question.explanation,
      options: item.question.options,
      module: item.question.module,
      
      // 👇 MASUKKAN NOMOR HASIL HITUNGAN KE SINI
      bankNumber: bankNumberMap[item.question.id] || 0 
    }
  })

  // 6. Hitung Sisa Waktu
  const startTime = new Date(session.created_at).getTime()
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