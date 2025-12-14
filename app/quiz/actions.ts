'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Ambil semua mata kuliah
export async function getSubjects() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code')
    .order('name')

  if (error) {
    console.error('Error fetching subjects:', error.message)
    return []
  }
  return data
}

// 2. Ambil sumber berdasarkan mata kuliah
export async function getSources(subjectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, type')
    .eq('subject_id', subjectId)
    .order('name')

  if (error) {
    console.error('Error fetching sources:', error.message)
    return []
  }
  return data
}

// 3. Ambil modul berdasarkan sumber
export async function getModules(sourceId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('modules')
    .select('id, name')
    .eq('source_id', sourceId)
    .order('name')

  if (error) {
    console.error('Error fetching modules:', error.message)
    return []
  }
  return data
}

// 5. Ambil Statistik User (Total & Rata-rata)
export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { totalQuiz: 0, avgScore: 0 }

  // Ambil hanya yang STATUSNYA COMPLETED (Selesai)
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('score')
    .eq('user_id', user.id)
    .eq('status', 'completed') // <--- Filter Penting!

  if (error || !data || data.length === 0) {
    return { totalQuiz: 0, avgScore: 0 }
  }

  const totalQuiz = data.length
  // Hitung rata-rata dari skor yang ada
  const totalScore = data.reduce((acc, curr) => acc + (curr.score || 0), 0)
  const avgScore = Math.round(totalScore / totalQuiz)

  return { totalQuiz, avgScore }
}

// 5. Ambil Soal untuk Kuis (Mendukung Mode Exam & Study)
export async function getQuizQuestions(moduleId: string, mode: 'exam' | 'study' = 'exam') {
  const supabase = await createClient()

  // QUERY BUILDER:
  // Jika Exam: HANYA id & text opsi.
  // Jika Study: Sertakan is_correct & explanation.
  let selectQuery = ''
  
  if (mode === 'exam') {
    selectQuery = `
      id,
      content,
      options (
        id,
        text
      )
    `
  } else {
    // Mode Study: Ambil Kunci Jawaban & Pembahasan
    selectQuery = `
      id,
      content,
      explanation,
      options (
        id,
        text,
        is_correct
      )
    `
  }

  const { data, error } = await supabase
    .from('questions')
    .select(selectQuery)
    .eq('module_id', moduleId)

  if (error) {
    console.error('Error fetching questions:', error.message)
    return []
  }

  // Acak urutan soal
  return data.sort(() => Math.random() - 0.5)
}

// 6. Submit Jawaban (VERSI DEBUGGING)
export async function submitQuiz(sessionId: string, answers: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  console.log("--- MULAI SUBMIT QUIZ ---")
  console.log("Session ID:", sessionId)
  
  const questionIds = Object.keys(answers)
  if (questionIds.length === 0) throw new Error('Tidak ada jawaban')

  // Ambil Soal & Kunci Jawaban
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, content, options(id, text, is_correct)')
    .in('id', questionIds)

  if (qError || !questions) {
    console.error("GAGAL AMBIL SOAL:", qError)
    throw new Error('Gagal memuat soal dari database')
  }

  console.log(`Berhasil memuat ${questions.length} soal untuk diperiksa.`)

  let correctCount = 0
  const answersData = []
  const masteryUpdates = []

  // LOOP PEMERIKSAAN JAWABAN
  for (const qId of questionIds) {
    const selectedOptId = answers[qId] // Jawaban User
    const question = questions.find(q => q.id === qId)
    
    if (question && question.options) {
        // Cari Kunci Jawaban di Database
        const correctOption = question.options.find(o => o.is_correct)
        
        // Cek Apakah Cocok?
        const isCorrect = correctOption?.id === selectedOptId

        // --- CCTV LOG (Cek Terminal VS Code Anda nanti) ---
        console.log(`Soal: ${question.content.substring(0, 20)}...`)
        console.log(`   - Jawaban User ID: ${selectedOptId}`)
        console.log(`   - Kunci Jawaban ID: ${correctOption?.id}`)
        console.log(`   - HASIL: ${isCorrect ? "BENAR ✅" : "SALAH ❌"}`)
        // --------------------------------------------------

        if (isCorrect) correctCount++

        answersData.push({
            session_id: sessionId,
            question_id: qId,
            selected_option_id: selectedOptId,
            is_correct: isCorrect
        })

        if (isCorrect) masteryUpdates.push(qId)
    } else {
        console.error(`Soal ID ${qId} tidak ditemukan atau tidak punya opsi!`)
    }
  }

  // Hitung Skor
  const score = Math.round((correctCount / questionIds.length) * 100)
  console.log(`SKOR AKHIR: ${score} (Benar ${correctCount} dari ${questionIds.length})`)

  // Simpan Jawaban
  await supabase.from('quiz_answers').insert(answersData)

  // Update Skor
  const { error: updateError } = await supabase
    .from('quiz_sessions')
    .update({ status: 'completed', score, completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (updateError) {
      console.error("FATAL: Gagal simpan skor ke database!", updateError)
  } else {
      console.log("SUKSES: Skor berhasil disimpan ke database.")
  }

  // Update Mastery (Hafalan)
  for (const qId of masteryUpdates) {
    const { data: existing } = await supabase
      .from('user_mastery')
      .select('correct_count')
      .eq('user_id', user.id).eq('question_id', qId).single()

    if (existing) {
      await supabase.from('user_mastery')
        .update({ correct_count: existing.correct_count + 1, last_answered_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('question_id', qId)
    } else {
      await supabase.from('user_mastery')
        .insert({ user_id: user.id, question_id: qId, correct_count: 1 })
    }
  }

  revalidatePath('/dashboard')
  return { success: true, sessionId }
}

// 7. Ambil Detail Hasil Kuis (Untuk Halaman Review)
export async function getQuizResult(sessionId: string) {
  const supabase = await createClient()
  
  // A. Ambil Data Sesi + RELASI KE MATKUL (Ini yang diperbaiki)
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      quiz_title,
      module:modules (
        name,
        source:sources (
          name,
          subject:subjects (name, code)
        )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) return null

  // Security Check
  const { data: { user } } = await supabase.auth.getUser()
  if (session.user_id !== user?.id) {
     return null 
  }

  // B. Ambil Jawaban User + Soal + Opsi + Pembahasan
  const { data: answers, error: answerError } = await supabase
    .from('quiz_answers')
    .select(`
      id,
      selected_option_id,
      is_correct,
      question:questions (
        id,
        content,
        explanation,
        options (
          id,
          text,
          is_correct
        )
      )
    `)
    .eq('session_id', sessionId)

  if (answerError) {
    console.error('Error fetching reviews:', answerError)
    return null
  }

  return { session, reviews: answers }
}

// 8. Ambil Riwayat Kuis User
export async function getQuizHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select(`
      id,
      score,
      status,
      created_at,
      quiz_title,
      module:modules (
        name,
        source:sources (
          name,
          subject:subjects (
            name,
            code
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed') // <--- TAMBAHAN PENTING: HANYA YANG SELESAI
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching history:', error.message)
    return []
  }

  return data
}

// FUNGSI BARU: Ambil Soal dari BANYAK Modul + Limit Jumlah
export async function getCustomQuizQuestions(moduleIds: string[], limit: number, mode: 'exam' | 'study') {
  const supabase = await createClient()

  let selectQuery = ''
  if (mode === 'exam') {
    selectQuery = 'id, content, options(id, text)'
  } else {
    selectQuery = 'id, content, explanation, options(id, text, is_correct)'
  }

  // Gunakan .in() untuk array moduleIds
  const { data, error } = await supabase
    .from('questions')
    .select(selectQuery)
    .in('module_id', moduleIds) 

  if (error) {
    console.error('Error fetching questions:', error.message)
    return []
  }

  // 1. Acak Soal
  const shuffled = data.sort(() => Math.random() - 0.5)
  
  // 2. Potong sesuai Limit yang diminta user
  return shuffled.slice(0, limit)
}

// FUNGSI BARU: Ambil Soal Per Matkul (Filter Mastery < 3)
export async function getSmartSubjectQuestions(subjectId: string, limit: number = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Ambil ID Soal yang SUDAH MASTER (Benar >= 3x)
  const { data: mastered } = await supabase
    .from('user_mastery')
    .select('question_id')
    .eq('user_id', user.id)
    .gte('correct_count', 3) // Batas 3 kali benar

  const masteredIds = mastered?.map(m => m.question_id) || []

  // 2. Ambil Soal dari Mata Kuliah Tersebut
  // Kita harus join: Questions -> Modules -> Sources -> Subjects
  // Karena Supabase Query agak terbatas untuk deep filter + not in sekaligus,
  // kita ambil soalnya dulu lalu filter di server (atau pakai RPC function kalau mau canggih, tapi ini cukup untuk MVP).
  
  // Ambil semua modul di matkul ini
  const { data: modules } = await supabase
    .from('modules')
    .select('id, source:sources!inner(subject_id)')
    .eq('source.subject_id', subjectId)
  
  const moduleIds = modules?.map(m => m.id) || []

  if (moduleIds.length === 0) return []

  // Ambil Soal yang TIDAK ADA di daftar Mastered
  let query = supabase
    .from('questions')
    .select('id, content, options(id, text, is_correct)')
    .in('module_id', moduleIds)
  
  if (masteredIds.length > 0) {
    // Filter out mastered questions
    // Note: Supabase JS library .not('id', 'in', ...) support array
    query = query.not('id', 'in', `(${masteredIds.join(',')})`)
  }

  const { data: questions, error } = await query

  if (error || !questions) return []

  // 3. Acak & Limit
  const shuffled = questions.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}

// FUNGSI BARU: Ambil Statistik Dashboard (8 Kartu)
export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Ambil Semua Matkul
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code')
    .order('code')

  if (!subjects) return []

  // 2. Hitung Statistik per Matkul
  // Ini agak berat kalau datanya jutaan, tapi untuk MVP ini oke.
  const stats = await Promise.all(subjects.map(async (sub) => {
    
    // A. Cari ID Modul milik Matkul ini
    const { data: mods } = await supabase
      .from('modules')
      .select('id, source:sources!inner(subject_id)')
      .eq('source.subject_id', sub.id)
    const modIds = mods?.map(m => m.id) || []

    if (modIds.length === 0) return { ...sub, total: 0, mastered: 0, remaining: 0 }

    // B. Hitung Total Soal di Matkul ini
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .in('module_id', modIds)

    // C. Hitung Soal yang sudah Master (>= 3x Benar) di Matkul ini
    // Kita perlu join user_mastery -> questions -> modules
    // Cara gampang: Ambil mastery user, filter question_id yang ada di modIds
    const { data: userMastery } = await supabase
      .from('user_mastery')
      .select('question_id')
      .eq('user_id', user.id)
      .gte('correct_count', 3)
      
    // Filter manual: Cek apakah question_id milik userMastery ada di dalam database soal matkul ini?
    // Agar efisien, kita balik: Ambil ID soal matkul ini, cek berapa yang ada di userMastery
    // (Untuk MVP, kita pakai estimasi query mastery yang lebih sederhana)
    
    // Query Soal Master spesifik Matkul ini
    const { count: masteredCount } = await supabase
      .from('user_mastery')
      .select('question_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('correct_count', 3)
      .in('question_id', (
         // Subquery: Ambil semua ID soal di matkul ini
         // (Supabase JS client limitasi di subquery raw, kita akali dengan logic JS di atas atau asumsi)
         // OK, cara paling aman tanpa raw SQL complex:
         // Kita sudah punya modIds. Kita query soal IDs.
         await supabase.from('questions').select('id').in('module_id', modIds).then(res => res.data?.map(q => q.id) || [])
      ))

    const total = totalQuestions || 0
    const master = masteredCount || 0
    
    return {
      ...sub,
      total: total,
      mastered: master,
      remaining: Math.max(0, total - master)
    }
  }))

  return stats
}
// --- UPDATE FINAL: DYNAMIC MASTERY THRESHOLD ---

export async function getDetailedStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { global: null, subjects: [] }

  // 1. Ambil Subjects + Threshold-nya
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold') // <-- Ambil kolom baru
  if (!subjects) return { global: null, subjects: [] }

  // 2. Ambil Semua Soal
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, module:modules!inner(source:sources!inner(subject_id))')
  
  // 3. Ambil Mastery (HAPUS filter .gte 3, kita filter manual nanti)
  const { data: allMastery } = await supabase
    .from('user_mastery')
    .select('correct_count, question_id, question:questions!inner(module:modules!inner(source:sources!inner(subject_id)))')
    .eq('user_id', user.id)
    // .gte('correct_count', 3) <-- INI KITA HAPUS AGAR BISA DINAMIS

  // 4. Ambil Sesi (Deep Scan Logic)
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  // Mapping Session -> Subject (Sama seperti sebelumnya)
  const sessionIds = sessions?.map(s => s.id) || []
  let sessionSubjectMap: Record<string, string> = {}
  if (sessionIds.length > 0) {
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select(`session_id, question:questions!inner(module:modules!inner(source:sources!inner(subject_id)))`)
      .in('session_id', sessionIds)
    
    answers?.forEach((ans: any) => {
      if (ans.session_id && ans.question?.module?.source?.subject_id) {
        sessionSubjectMap[ans.session_id] = ans.question.module.source.subject_id
      }
    })
  }

  // 5. OLAH DATA FINAL (DENGAN LOGIKA BARU)
  let globalTotalQ = 0
  let globalMastered = 0

  const stats = subjects.map(sub => {
    // Ambil Target Master khusus matkul ini (Default 3 jika null)
    const threshold = sub.mastery_threshold || 3

    // A. Filter Soal
    const subQuestions = allQuestions?.filter((q: any) => q.module?.source?.subject_id === sub.id) || []
    
    // B. Filter Mastery (Gunakan Threshold Dinamis)
    const subMastery = allMastery?.filter((m: any) => {
       const isBelong = m.question?.module?.source?.subject_id === sub.id
       const isMaster = (m.correct_count || 0) >= threshold // <-- LOGIKA DINAMIS
       return isBelong && isMaster
    }) || []
    
    // C. Filter Sesi
    const subSessions = sessions?.filter((s: any) => sessionSubjectMap[s.id] === sub.id) || []
    const totalQuiz = subSessions.length
    const avgScore = totalQuiz > 0 
      ? Math.round(subSessions.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / totalQuiz)
      : 0

    // Akumulasi Global
    globalTotalQ += subQuestions.length
    globalMastered += subMastery.length

    return {
      ...sub,
      totalQuestions: subQuestions.length,
      masteredQuestions: subMastery.length,
      progress: subQuestions.length > 0 ? Math.round((subMastery.length / subQuestions.length) * 100) : 0,
      remaining: Math.max(0, subQuestions.length - subMastery.length),
      quizCount: totalQuiz,
      avgScore: avgScore,
      masteryThreshold: threshold // Info tambahan buat UI kalau perlu
    }
  })

  // 6. Global Stats
  const globalProgress = globalTotalQ > 0 ? Math.round((globalMastered / globalTotalQ) * 100) : 0

  return {
    global: {
      totalQuestions: globalTotalQ,
      mastered: globalMastered,
      progress: globalProgress,
      remaining: globalTotalQ - globalMastered
    },
    subjects: stats
  }
}