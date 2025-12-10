import { createClient } from '@/utils/supabase/server'
import { getQuizQuestions } from '@/app/quiz/actions'
import QuizInterface from '@/components/quiz-interface'
import { redirect } from 'next/navigation'

export default async function QuizStartPage({ 
  params,
  searchParams // Next.js 15: searchParams untuk baca ?mode=...
}: { 
  params: Promise<{ moduleId: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const supabase = await createClient()

  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Ambil Params & Search Params
  const { moduleId } = await params
  const { mode: modeParam } = await searchParams

  // Validasi Mode (hanya boleh 'exam' atau 'study', default 'exam')
  const mode = (modeParam === 'study') ? 'study' : 'exam'

  // 3. Buat Session Baru
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      module_id: moduleId,
      mode: mode, // Simpan mode ke database
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('Failed to create session:', sessionError)
    return <div>Gagal memulai sesi ujian. Silakan kembali dan coba lagi.</div>
  }

  // 4. Ambil Soal Sesuai Mode
  // Jika mode='study', server akan mengirim is_correct & explanation
  const questions = await getQuizQuestions(moduleId, mode)

  return (
    <div className="min-h-screen bg-gray-50">
<QuizInterface 
          questions={questions as any} // <--- Tambahkan "as any" di sini
          sessionId={session.id}
          mode={mode} 
       />
    </div>
  )
}