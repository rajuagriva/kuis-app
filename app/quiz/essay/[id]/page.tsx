import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EssayClient from '../essay-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Latihan Essay AI | Let\'s Ujian',
  description: 'Uji kemampuan essay Anda dengan penilaian otomatis dari AI Tutor.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EssaySessionPage({ params }: PageProps) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  // 1. Cek Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch Sesi Kuis
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    redirect('/dashboard')
  }

  // Jika sesi sudah completed, redirect ke halaman hasil
  if (session.status === 'completed') {
    redirect(`/result/${sessionId}`)
  }

  // 3. Fetch Soal dan Jawaban Essay untuk sesi ini
  const { data: answersData, error } = await supabase
    .from('quiz_answers')
    .select(`
      id,
      essay_answer,
      ai_score,
      ai_feedback,
      question:questions (
        id,
        content,
        explanation,
        module:modules (
          name,
          source:sources (
            subject:subjects (
              name,
              code
            )
          )
        )
      )
    `)
    .eq('session_id', sessionId)
    .order('order', { ascending: true })

  if (error || !answersData || answersData.length === 0) {
    console.error("🔥 Error fetching essay session answers:", error)
    redirect('/dashboard')
  }

  // Ambil Info Subject dari soal pertama
  const firstQuestion = answersData[0]?.question as any
  const rawSubject = firstQuestion?.module?.source?.subject
  const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject

  const subjectName = subject?.name || 'Mata Kuliah'
  const subjectCode = subject?.code || '-'

  // Map ke format prop yang rapi untuk EssayClient
  const questions = answersData.map((item: any) => ({
    id: item.question.id,
    content: item.question.content,
    explanation: item.question.explanation || '',
    essayAnswer: item.essay_answer || '',
    aiScore: item.ai_score,
    aiFeedback: item.ai_feedback || ''
  }))

  return (
    <EssayClient
      sessionId={sessionId}
      subjectName={subjectName}
      subjectCode={subjectCode}
      questions={questions}
    />
  )
}
