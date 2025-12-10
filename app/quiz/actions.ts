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
  console.log("--- MULAI SUBMIT ---")
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // A. Ambil Kunci Jawaban
    const questionIds = Object.keys(answers)
    if (questionIds.length === 0) {
       await supabase.from('quiz_sessions').update({
          status: 'completed', score: 0, finished_at: new Date().toISOString()
       }).eq('id', sessionId)
       return { score: 0 }
    }

    const { data: correctOptions, error: optError } = await supabase
      .from('options')
      .select('question_id, id')
      .in('question_id', questionIds)
      .eq('is_correct', true)
    
    if (optError) throw new Error("Gagal ambil kunci jawaban: " + optError.message)

    // B. Hitung Skor
    const keyMap: Record<string, string> = {}
    correctOptions?.forEach(opt => { keyMap[opt.question_id] = opt.id })

    let correctCount = 0
    const totalQuestions = questionIds.length
    const detailAnswersToInsert = []

    for (const [qId, selectedOptId] of Object.entries(answers)) {
      const isCorrect = keyMap[qId] === selectedOptId
      if (isCorrect) correctCount++

      detailAnswersToInsert.push({
        session_id: sessionId,
        question_id: qId,
        selected_option_id: selectedOptId,
        is_correct: isCorrect
      })
    }

    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

    // C. Update Session
    const { error: updateError } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'completed',
        score: finalScore,
        finished_at: new Date().toISOString()
      })
      .eq('id', sessionId)
    
    if (updateError) throw new Error("Gagal update session: " + updateError.message)

    // D. Insert Jawaban Detail
    if (detailAnswersToInsert.length > 0) {
      const { error: insertError } = await supabase.from('quiz_answers').insert(detailAnswersToInsert)
      if (insertError) throw new Error("Gagal insert jawaban: " + insertError.message)
    }

    return { score: finalScore }

  } catch (error: any) {
    console.error("CRITICAL ERROR di submitQuiz:", error)
    throw error
  }
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