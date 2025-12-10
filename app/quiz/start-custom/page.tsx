import { createClient } from '@/utils/supabase/server'
import { getCustomQuizQuestions } from '@/app/quiz/actions'
import QuizInterface from '@/components/quiz-interface'
import { redirect } from 'next/navigation'

export default async function CustomQuizStartPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ modules?: string, count?: string, mode?: string }> 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  
  const moduleIds = params.modules ? params.modules.split(',') : []
  const count = parseInt(params.count || '10')
  const mode = (params.mode === 'study') ? 'study' : 'exam'

  if (moduleIds.length === 0) {
    return <div className="p-10 text-center">Tidak ada modul yang dipilih.</div>
  }

  // --- LOGIC BARU: AMBIL NAMA MODUL & MATKUL UNTUK JUDUL ---
  const { data: modulesInfo } = await supabase
    .from('modules')
    .select(`
      name,
      source:sources (
        subject:subjects (name, code)
      )
    `)
    .in('id', moduleIds)

  // Buat Judul Cantik
  // Contoh: "MK01: Modul 1, Modul 2"
  let quizTitle = "Kuis Custom"
  if (modulesInfo && modulesInfo.length > 0) {
    // Ambil kode matkul dari modul pertama (asumsi user memilih modul dalam 1 matkul)
    // @ts-ignore
    const subjectCode = modulesInfo[0]?.source?.subject?.code || modulesInfo[0]?.source?.subject?.name || "Kuis"
    const moduleNames = modulesInfo.map(m => m.name).join(', ')
    
    // Potong jika terlalu panjang
    const displayModules = moduleNames.length > 50 ? moduleNames.substring(0, 50) + '...' : moduleNames
    
    quizTitle = `${subjectCode}: ${displayModules}`
  }
  // ---------------------------------------------------------

  // Buat Sesi Baru dengan quiz_title
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      module_id: null, 
      quiz_title: quizTitle, // <--- SIMPAN JUDUL DI SINI
      mode: mode,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error(sessionError)
    return <div>Gagal memulai sesi.</div>
  }

  const questions = await getCustomQuizQuestions(moduleIds, count, mode as 'exam'|'study')

  return (
    <div className="min-h-screen bg-gray-50">
       <QuizInterface 
          questions={questions as any} 
          sessionId={session.id}
          mode={mode as 'exam'|'study'}
       />
    </div>
  )
}