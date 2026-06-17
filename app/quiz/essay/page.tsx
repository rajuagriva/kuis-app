import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createQuizSession } from '@/app/quiz/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EssayPracticeRouter({ searchParams }: { searchParams: Promise<{ subjectId?: string }> }) {
  const { subjectId } = await searchParams
  
  if (!subjectId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // 1. Cek Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Cari Sesi Essay Aktif (in_progress) untuk User ini & Subject ini
  const { data: activeSessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .eq('mode', 'essay')

  let activeSessionId = null

  if (activeSessions && activeSessions.length > 0) {
    for (const sess of activeSessions) {
      // Query satu jawaban untuk memverifikasi kecocokan subject_id
      const { data: ans } = await supabase
        .from('quiz_answers')
        .select('question:questions(module:modules(source:sources(subject_id)))')
        .eq('session_id', sess.id)
        .limit(1)
        .maybeSingle()
      
      const answerSubjectId = (ans as any)?.question?.module?.source?.subject_id
      if (answerSubjectId === subjectId) {
        activeSessionId = sess.id
        break
      }
    }
  }

  // 3. Jika sesi aktif ditemukan, langsung redirect
  if (activeSessionId) {
    redirect(`/quiz/essay/${activeSessionId}`)
  }

  // 4. Jika tidak ada, buat sesi baru
  const result = await createQuizSession('essay', {
    subjectId,
    count: 10 // Ambil maksimal 10 soal essay
  })

  if (result.error) {
    // Redirect ke dashboard dengan pesan error
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`)
  }

  if (result.sessionId) {
    redirect(`/quiz/essay/${result.sessionId}`)
  }

  redirect('/dashboard')
}
