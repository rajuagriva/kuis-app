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

// 4. Hitung statistik user login
export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { totalQuiz: 0, avgScore: 0 }

  const { data: sessions, error } = await supabase
    .from('quiz_sessions')
    .select('score')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  if (error || !sessions) return { totalQuiz: 0, avgScore: 0 }

  const totalQuiz = sessions.length
  const totalScore = sessions.reduce((acc, curr) => acc + (curr.score || 0), 0)
  const avgScore = totalQuiz > 0 ? Math.round(totalScore / totalQuiz) : 0

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

// 6. Submit Jawaban & Hitung Nilai
export async function submitQuiz(sessionId: string, answers: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Ambil Kunci Jawaban (Sama seperti sebelumnya)
  const questionIds = Object.keys(answers)
  if (questionIds.length === 0) throw new Error('Tidak ada jawaban')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, options(id, is_correct)')
    .in('id', questionIds)

  if (!questions) throw new Error('Gagal memuat soal')

  // 2. Hitung Skor & Siapkan Data Jawaban
  let correctCount = 0
  const answersData = []
  const masteryUpdates = [] // <--- Array untuk update mastery

  for (const qId of questionIds) {
    const selectedOptId = answers[qId]
    const question = questions.find(q => q.id === qId)
    const correctOption = question?.options.find(o => o.is_correct)
    const isCorrect = correctOption?.id === selectedOptId

    if (isCorrect) correctCount++

    answersData.push({
      session_id: sessionId,
      question_id: qId,
      selected_option_id: selectedOptId,
      is_correct: isCorrect
    })

    // LOGIC MASTERY: Hanya jika BENAR, kita siapkan update
    if (isCorrect) {
      masteryUpdates.push(qId)
    }
  }

  const score = Math.round((correctCount / questionIds.length) * 100)

  // 3. Simpan Jawaban ke Database
  await supabase.from('quiz_answers').insert(answersData)

  // 4. Update Status Sesi
  await supabase
    .from('quiz_sessions')
    .update({ status: 'completed', score, completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  // 5. EKSEKUSI MASTERY (Fitur Baru)
  // Kita loop satu per satu soal yang benar untuk di-upsert (Insert or Update)
  // Logic: Jika belum ada -> insert 1. Jika sudah ada -> tambah 1.
  for (const qId of masteryUpdates) {
    // A. Cek data lama
    const { data: existing } = await supabase
      .from('user_mastery')
      .select('correct_count')
      .eq('user_id', user.id)
      .eq('question_id', qId)
      .single()

    if (existing) {
      // Update: Tambah 1
      await supabase
        .from('user_mastery')
        .update({ 
          correct_count: existing.correct_count + 1,
          last_answered_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('question_id', qId)
    } else {
      // Insert Baru: Set 1
      await supabase
        .from('user_mastery')
        .insert({ 
          user_id: user.id, 
          question_id: qId, 
          correct_count: 1 
        })
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

// 8. Ambil Riwayat Kuis User (Untuk Dashboard)
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