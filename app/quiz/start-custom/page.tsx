import { createClient } from '@/utils/supabase/server'
import { getCustomQuizQuestions, getSmartSubjectQuestions } from '@/app/quiz/actions'
import QuizInterface from '@/components/quiz-interface'
import { redirect } from 'next/navigation'

export default async function CustomQuizStartPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ modules?: string, count?: string, mode?: string, subjectId?: string }> 
}) {
  const supabase = await createClient()
  
  // 1. Cek Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Parse Parameter URL
  const params = await searchParams
  
  const count = parseInt(params.count || '10')
  const mode = (params.mode === 'study') ? 'study' : 'exam'
  const subjectId = params.subjectId
  
  // Variabel untuk menampung hasil logic
  let quizTitle = "Kuis Custom"
  let questions: any[] = []

  // --- LOGIC CABANG (Branching) ---
  
  if (subjectId) {
    // === SKENARIO A: LATIHAN CERDAS PER MATKUL (Dari Dashboard Kartu) ===
    
    // A1. Ambil Nama Matkul untuk Judul
    const { data: sub } = await supabase
      .from('subjects')
      .select('name, code')
      .eq('id', subjectId)
      .single()
      
    if (sub) {
      quizTitle = `Latihan: ${sub.name}`
    }

    // A2. Ambil Soal Cerdas (Filter Mastery)
    questions = await getSmartSubjectQuestions(subjectId, count)

  } else {
    // === SKENARIO B: LATIHAN MANUAL PILIH MODUL (Dari Tombol "Mulai Belajar Baru") ===
    
    const moduleIds = params.modules ? params.modules.split(',') : []
    
    if (moduleIds.length === 0) {
      return <div className="p-10 text-center">Tidak ada modul yang dipilih.</div>
    }

    // B1. Ambil Nama Modul untuk Judul
    const { data: modulesInfo } = await supabase
      .from('modules')
      .select(`
        name,
        source:sources (
          subject:subjects (name, code)
        )
      `)
      .in('id', moduleIds)

    // Format Judul: "MK01: Modul 1, Modul 2"
    if (modulesInfo && modulesInfo.length > 0) {
      // @ts-ignore
      const subjectCode = modulesInfo[0]?.source?.subject?.code || "Kuis"
      const moduleNames = modulesInfo.map(m => m.name).join(', ')
      // Potong jika terlalu panjang
      const displayModules = moduleNames.length > 50 ? moduleNames.substring(0, 50) + '...' : moduleNames
      quizTitle = `${subjectCode}: ${displayModules}`
    }

    // B2. Ambil Soal Custom Biasa (Tanpa Filter Mastery)
    questions = await getCustomQuizQuestions(moduleIds, count, mode)
  }

  // --- 3. BUAT SESI BARU (CREATE SESSION) ---
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      module_id: null, // Selalu null untuk kuis custom
      quiz_title: quizTitle, // Judul dinamis hasil logic di atas
      mode: mode,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('Session Error:', sessionError)
    return <div className="p-10 text-center">Gagal memulai sesi ujian.</div>
  }

  // Cek jika soal kosong (Misal: User sudah master semua soal di matkul ini)
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
          <h2 className="text-xl font-bold text-green-600 mb-2">Luar Biasa! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Anda telah menguasai semua soal di materi ini (Sudah benar 3x).
            Tidak ada soal baru yang tersedia untuk saat ini.
          </p>
          <a href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    )
  }

  // --- 4. RENDER INTERFACE ---
  return (
    <div className="min-h-screen bg-gray-50">
       <QuizInterface 
          questions={questions} 
          sessionId={session.id}
          mode={mode}
       />
    </div>
  )
}