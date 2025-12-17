import { createQuizSession } from '@/app/quiz/actions'
import { redirect } from 'next/navigation'

export default async function CustomQuizStartPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ modules?: string, count?: string, mode?: string, subjectId?: string }> 
}) {
  
  // 1. Ambil Parameter
  const params = await searchParams
  const count = parseInt(params.count || '10')
  const mode = (params.mode === 'study') ? 'study' : 'exam'
  const subjectId = params.subjectId
  const moduleIds = params.modules ? params.modules.split(',') : undefined

  // Variable untuk menampung ID sesi sementara
  let newSessionId: string | null = null

  try {
     // 2. Buat Sesi Baru (Server Action)
     const result = await createQuizSession({
       mode,
       count,
       subjectId,
       moduleIds
     })
     
     // Simpan ID sesi, TAPI JANGAN REDIRECT DI SINI
     newSessionId = result.sessionId

  } catch (error) {
    console.error("Gagal membuat sesi kuis:", error)
    // Biarkan newSessionId tetap null
  }

  // 3. LOGIC REDIRECT (Di luar Try-Catch)
  if (newSessionId) {
    // Jika sukses, pindah ke ruang ujian
    redirect(`/quiz/${newSessionId}`)
  } else {
    // Jika gagal (session ID null), kembalikan ke dashboard error
    redirect('/dashboard?error=gagal-mulai')
  }
}