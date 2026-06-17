'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

// --- HELPER: AC & DISTRIBUSI SOAL (STRATIFIED SAMPLING) ---
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ============================================================================
// 1. GET SUBJECTS (FILTERED BY ENROLLMENT)
// ============================================================================
export async function getSubjects() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold')
    .order('name')

  if (error) {
    console.error('Error fetching subjects:', error.message)
    return []
  }
  return data
}

// 2. Ambil sumber (Helper)
export async function getSources(subjectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, type')
    .eq('subject_id', subjectId)
    .order('name')
  if (error) return []
  return data
}

// 3. Ambil modul (Helper)
export async function getModules(sourceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('id, name')
    .eq('source_id', sourceId)
    .order('name')
  if (error) return []
  return data
}

// 4. Statistik User (Total & Rata-rata - Global)
export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalQuiz: 0, avgScore: 0 }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('score')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  if (error || !data || data.length === 0) return { totalQuiz: 0, avgScore: 0 }

  const totalQuiz = data.length
  const totalScore = data.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0)
  const avgScore = Math.round(totalScore / totalQuiz)
  return { totalQuiz, avgScore }
}

// ============================================================================
// CORE LOGIC: CREATE SESSION & DISTRIBUSI SOAL (SECURED & FILTERED BY MASTERY)
// ============================================================================
export async function createQuizSession(
  mode: 'practice' | 'exam' | 'study' | 'essay',
  config: { 
    subjectId?: string; 
    topicId?: string;    // Untuk single module
    moduleIds?: string[]; // 👈 TAMBAHAN PENTING: Untuk support banyak modul
    count: number 
  }
) {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // ---------------------------------------------------------
  // 1. SETTING THRESHOLD (FORCE 1)
  // ---------------------------------------------------------
  // Kita paksa 1 agar logika "Sudah dijawab benar" valid (sekali benar langsung hilang)
  const MASTERY_THRESHOLD = 1;

  console.log("🚀 Create Session:", { mode, modules: config.moduleIds, count: config.count })

  // ---------------------------------------------------------
  // 2. QUERY SOAL (SUPPORT MULTI MODULE + NAME)
  // ---------------------------------------------------------
  let query = supabase
    .from('questions')
    .select(`
      id,
      content,
      explanation,
      module_id,
      type,
      module:modules!inner (
        id,
        name,
        source:sources!inner (
          id,
          subject_id,
          subject:subjects (
            name
          )
        )
      ),
      options(id, text, is_correct)
    `)

  // Filter Aksen: Mode Essay vs Mode Biasa
  if (mode === 'essay') {
    query = query.eq('type', 'essay')
  } else {
    query = query.or('type.eq.multiple_choice,type.is.null')
  }

  // Filter A: Jika User memilih spesifik 1 Modul
  if (config.topicId) {
    query = query.eq('module_id', config.topicId)
  }
  
  // Filter B: Jika User memilih BANYAK Modul (Ini perbaikan utamanya)
  // Kita gunakan .in() untuk memfilter array ID
  else if (config.moduleIds && config.moduleIds.length > 0) {
    query = query.in('module_id', config.moduleIds)
  }

  // Filter C: Jika tidak pilih modul, ambil per Mata Kuliah (Fallback)
  else if (config.subjectId) {
    query = query.eq('module.source.subject_id', config.subjectId)
  }

  const { data: allQuestions } = await query

  if (!allQuestions || allQuestions.length === 0) {
    return { error: 'Tidak ada soal ditemukan untuk modul yang dipilih.' }
  }

  
  // ---------------------------------------------------------
  // 3. FILTER LOGIC: CEK APAKAH SUDAH MASTER?
  // ---------------------------------------------------------
  
  const questionIdsToCheck = allQuestions.map(q => q.id)
  
  const { data: masteryData } = await supabase
    .from('user_mastery')
    .select('question_id, correct_count')
    .eq('user_id', user.id)
    .in('question_id', questionIdsToCheck)

  // Buat daftar ID soal yang sudah pernah benar MINIMAL 1 KALI
  const masteredIds = new Set(
    masteryData
      ?.filter(m => (m.correct_count || 0) >= MASTERY_THRESHOLD)
      .map(m => m.question_id) || []
  )

  // FILTER UTAMA: Hanya ambil yang BELUM ada di daftar masteredIds
  // Logika ini berlaku untuk SEMUA MODE (Exam/Study) sesuai permintaan Anda
  let finalPool = allQuestions.filter(q => !masteredIds.has(q.id))

  console.log(`📊 Statistik: Total Soal Modul=${allQuestions.length}, Sudah Benar=${masteredIds.size}, Sisa=${finalPool.length}`)

  // ---------------------------------------------------------
  // 4. HANDLING JIKA SUDAH BENAR SEMUA
  // ---------------------------------------------------------
  if (finalPool.length === 0) {
     return { error: `Anda sudah menjawab BENAR semua soal di modul-modul ini!` }
  }

  // ---------------------------------------------------------
  // 5. ACAK & LIMIT
  // ---------------------------------------------------------
  const shuffled = finalPool.sort(() => 0.5 - Math.random())
  const selectedQuestions = shuffled.slice(0, config.count)
  const questionIds = selectedQuestions.map(q => q.id)

  // ---------------------------------------------------------
  // 6. SIMPAN KE DATABASE
  // ---------------------------------------------------------
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: mode,
      total_questions: questionIds.length,
      current_question_index: 0,
      score: 0,
      status: 'in_progress',
      settings: config 
    })
    .select()
    .single()

  if (sessionError || !session) return { error: 'Gagal membuat sesi.' }

  const answerInserts = questionIds.map((qId, index) => ({
    session_id: session.id,
    question_id: qId,
    order: index,
    status: 'unanswered'
  }))

  

  const { error: answersError } = await supabase
    .from('quiz_answers')
    .insert(answerInserts)

  if (answersError) return { error: 'Gagal menyiapkan lembar jawaban.' }

  
  return { success: true, sessionId: session.id }
}

// Auto Save
export async function saveAnswer(sessionId: string, questionId: string, optionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('quiz_answers')
    .update({ 
      selected_option_id: optionId, 
      status: 'answered',
      updated_at: new Date().toISOString() 
    })
    .eq('session_id', sessionId)
    .eq('question_id', questionId)

  if (error) throw new Error('Gagal menyimpan jawaban')
  return { success: true }
}

// Submit Quiz
export async function submitQuiz(sessionId: string, answers: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Ambil semua lembar jawaban yang sudah disiapkan di database untuk sesi ini
  const { data: dbAnswers, error: dbAnswersError } = await supabase
    .from('quiz_answers')
    .select('question_id, selected_option_id')
    .eq('session_id', sessionId)

  if (dbAnswersError || !dbAnswers || dbAnswers.length === 0) {
    throw new Error('Gagal memuat detail kuis atau sesi tidak valid')
  }

  const allQuestionIds = dbAnswers.map((a: any) => a.question_id)

  // Gabungkan jawaban dari client (misal untuk Mode Belajar yang tidak auto-save ke DB)
  // dengan jawaban yang sudah tersimpan di database.
  const finalAnswers: Record<string, string | null> = {}
  for (const dbAns of dbAnswers) {
    finalAnswers[dbAns.question_id] = dbAns.selected_option_id
  }
  for (const [qId, optId] of Object.entries(answers)) {
    if (optId) {
      finalAnswers[qId] = optId
    }
  }

  // Ambil data soal beserta opsi benarnya
  const { data: questions } = await supabase
    .from('questions')
    .select('id, content, options(id, text, is_correct)')
    .in('id', allQuestionIds)

  if (!questions) throw new Error('Gagal memuat soal')

  let correctCount = 0
  const masteryUpdates = []

  for (const question of questions) {
    const qId = question.id
    const selectedOptId = finalAnswers[qId]
    
    if (question.options) {
      const correctOption = question.options.find((o: any) => o.is_correct)
      const isCorrect = selectedOptId ? correctOption?.id === selectedOptId : false
      if (isCorrect) correctCount++

      // Update lembar jawaban di database
      await supabase
        .from('quiz_answers')
        .update({
           selected_option_id: selectedOptId || null,
           is_correct: isCorrect,
           status: selectedOptId ? 'answered' : 'unanswered'
        })
        .eq('session_id', sessionId)
        .eq('question_id', qId)

      if (isCorrect) masteryUpdates.push(qId)
    }
  }

  const score = allQuestionIds.length > 0
    ? Math.round((correctCount / allQuestionIds.length) * 100)
    : 0

  await supabase.from('quiz_sessions')
    .update({ status: 'completed', score, completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  for (const qId of masteryUpdates) {
    const { data: existing } = await supabase
      .from('user_mastery')
      .select('correct_count')
      .eq('user_id', user.id)
      .eq('question_id', qId)
      .maybeSingle()

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

// Result
export async function getQuizResult(sessionId: string) {
  const supabase = await createClient()
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select(`*`)
    .eq('id', sessionId).single()

  if (sessionError) {
    console.error(`🔥 getQuizResult: Gagal memuat sesi kuis ${sessionId}:`, sessionError)
  }

  if (!session) {
    console.warn(`⚠️ getQuizResult: Sesi kuis ${sessionId} tidak ditemukan di database.`)
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn(`⚠️ getQuizResult: Tidak ada user yang login saat mengakses sesi ${sessionId}.`)
    return null
  }

  if (session.user_id !== user.id) {
    console.warn(`⚠️ getQuizResult: User mismatch. Pemilik sesi: ${session.user_id}, User login: ${user.id}`)
    return null 
  }

  const { data: answers, error: answersError } = await supabase
    .from('quiz_answers')
    .select(`id, selected_option_id, is_correct, essay_answer, ai_score, ai_feedback, question:questions(id, content, explanation, options(id, text, is_correct))`)
    .eq('session_id', sessionId)

  if (answersError) {
    console.error(`🔥 getQuizResult: Gagal memuat jawaban untuk sesi ${sessionId}:`, answersError)
  }

  return { session, reviews: answers }
}

// HISTORY: TAMPILKAN HANYA MATKUL YANG DI-ENROLL
// ============================================================================
export async function getQuizHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score, status, created_at, quiz_title')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select(`
      session_id,
      question:questions!inner (
        module:modules!inner (
          name,
          source:sources!inner (
            name,
            subject:subjects!inner (id, name, code)
          )
        )
      )
    `)
    .in('session_id', sessionIds)

  const sessionMap: Record<string, any> = {}
  answers?.forEach((ans: any) => {
    if (!sessionMap[ans.session_id]) {
      const q = ans.question
      const m = Array.isArray(q.module) ? q.module[0] : q.module
      const src = Array.isArray(m?.source) ? m.source[0] : m?.source
      const sub = Array.isArray(src?.subject) ? src.subject[0] : src?.subject

      if (sub && sub.id) {
        sessionMap[ans.session_id] = {
          subjectId: sub.id,
          subjectName: sub.name,
          moduleName: m?.name || 'Campuran'
        }
      }
    }
  })

  return sessions.map((session: any) => {
    const info = sessionMap[session.id]
    if (!info) return null
    return {
      ...session,
      module: {
        name: info.moduleName,
        source: {
          subject: {
            id: info.subjectId,
            name: info.subjectName
          }
        }
      }
    }
  }).filter((item: any) => item !== null)
}

// ============================================================================
// STATISTIK DASHBOARD (FULL FIX: Range + Left Join + NoStore)
// ============================================================================
export async function getDetailedStats() {
  noStore() // Tetap matikan cache

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { global: null, subjects: [] }

  // 1. PANGGIL FUNGSI SQL YANG TADI KITA BUAT
  // Supabase langsung mengembalikan hasil hitungan matang.
  const { data: statsData, error } = await supabase
    .rpc('get_student_stats', { target_user_id: user.id })

  if (error) {
    console.error("🔥 RPC Error:", error)
    return { global: null, subjects: [] }
  }

  if (!statsData) return { global: null, subjects: [] }

  // 2. Ambil Data Sesi Kuis (Untuk hitung rata-rata nilai & total kuis)
  // Ini tetap kita fetch manual karena logic-nya beda tabel
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('score, status, quiz_answers!inner(question:questions!inner(module:modules!inner(source:sources!inner(subject_id))))')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  // Helper untuk hitung rata-rata per subject
  const sessionStats: Record<string, { totalScore: number, count: number }> = {}
  
  sessions?.forEach((s: any) => {
    // Ambil subject_id dari soal pertama di kuis itu (sebagai penanda matkul)
    // (Asumsi 1 kuis = 1 matkul, atau mayoritas)
    const subjectId = s.quiz_answers?.[0]?.question?.module?.source?.subject_id
    
    if (subjectId) {
      if (!sessionStats[subjectId]) sessionStats[subjectId] = { totalScore: 0, count: 0 }
      sessionStats[subjectId].totalScore += (s.score || 0)
      sessionStats[subjectId].count += 1
    }
  })

  // 3. Gabungkan Data RPC + Data Session
  let globalTotalQ = 0
  let globalMastered = 0

  const finalStats = statsData.map((sub: any) => {
    const sStat = sessionStats[sub.subject_id] || { totalScore: 0, count: 0 }
    const avgScore = sStat.count > 0 ? Math.round(sStat.totalScore / sStat.count) : 0
    
    // Konversi BigInt ke Number (Supabase kadang balikin string buat angka gede)
    const totalQ = Number(sub.total_questions)
    const masteredQ = Number(sub.mastered_questions)

    globalTotalQ += totalQ
    globalMastered += masteredQ

    return {
      id: sub.subject_id,
      name: sub.subject_name,
      code: sub.subject_code,
      totalQuestions: totalQ,
      masteredQuestions: masteredQ,
      progress: totalQ > 0 ? Math.round((masteredQ / totalQ) * 100) : 0,
      remaining: Math.max(0, totalQ - masteredQ),
      quizCount: sStat.count,
      avgScore: avgScore,
      masteryThreshold: sub.mastery_threshold
    }
  })

  return {
    global: {
      totalQuestions: globalTotalQ,
      mastered: globalMastered,
      progress: globalTotalQ > 0 ? Math.round((globalMastered / globalTotalQ) * 100) : 0,
      remaining: globalTotalQ - globalMastered
    },
    subjects: finalStats
  }
}

// Leaderboard 
export async function getLeaderboard() {
  const supabase = await createClient()
  const { data: sessions, error } = await supabase.from('quiz_sessions').select('user_id, score').eq('status', 'completed')
  if (error || !sessions) return []

  const userStats: Record<string, { totalScore: number; count: number }> = {}
  sessions.forEach((s: any) => {
    if (!userStats[s.user_id]) userStats[s.user_id] = { totalScore: 0, count: 0 }
    userStats[s.user_id].totalScore += (s.score || 0)
    userStats[s.user_id].count += 1
  })

  const leaderboard = Object.keys(userStats).map((userId) => {
    const stat = userStats[userId]
    return {
      userId,
      avgScore: Math.round(stat.totalScore / stat.count),
      totalQuiz: stat.count,
      points: stat.totalScore 
    }
  })

  leaderboard.sort((a, b) => b.avgScore - a.avgScore)
  const top10 = leaderboard.slice(0, 10)
  const userIds = top10.map(u => u.userId)
  
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)

  return top10.map(stat => {
    const profile = profiles?.find((p: any) => p.id === stat.userId)
    return {
      ...stat,
      name: profile?.full_name || profile?.email?.split('@')[0] || 'Peserta',
      email: profile?.email || ''
    }
  })
}

// Profile 
export type ProfileState = { message?: string; error?: string; success?: string }

export async function updateProfile(prevState: any, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const fullName = formData.get('fullName') as string
  if (!fullName || fullName.trim().length < 3) return { error: 'Nama minimal 3 karakter.' }

  const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return { error: 'Gagal update profil.' }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')
  return { success: 'Profil berhasil diperbarui!' }
}

export async function getProfileStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: sessions } = await supabase.from('quiz_sessions').select('score, status').eq('user_id', user.id).eq('status', 'completed')

  const totalQuiz = sessions?.length || 0
  const totalScore = sessions?.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) || 0
  const avgScore = totalQuiz > 0 ? Math.round(totalScore / totalQuiz) : 0

  let level = "Pemula"
  if (totalScore > 500) level = "Siswa Rajin"
  if (totalScore > 1000) level = "Bintang Kelas"
  if (totalScore > 2000) level = "Sepuh Kuis 👑"

  return { user, profile, stats: { totalQuiz, totalScore, avgScore, level } }
}

export async function getActiveQuizSession(sessionId: string) {
  noStore()
  const supabase = await createClient()
  
  // 1. Ambil Detail Sesi
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (!session) return null

  // 2. Ambil Soal + Detail Matkul
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select(`
      id, status, selected_option_id,
      question:questions (
        id, content, explanation, created_at, module_id, 
        module:modules (
          id, name,
          source:sources (
            subject:subjects (name)
          )
        ),
        options (id, text)
      )
    `)
    .eq('session_id', sessionId)
    .order('order', { ascending: true })

  if (!answers) return null

  // --- LOGIKA BARU: HITUNG NOMOR URUT (RANK) SEPERTI DI ADMIN ---
  // Kita cari semua soal dari modul yang sama, lalu urutkan berdasarkan created_at
  // Ini meniru cara Admin menampilkan nomor urut.
  
  const moduleIds = [...new Set(answers.map((a: any) => a.question.module_id))]
  
  // Ambil SEMUA ID soal dari modul-modul ini (bukan cuma yang ada di kuis)
  const { data: allModuleQuestions } = await supabase
    .from('questions')
    .select('id, module_id, created_at')
    .in('module_id', moduleIds)
    .order('created_at', { ascending: true }) // 👈 PENTING: Urutan harus sama dengan Admin Panel

  // Buat Kamus: ID Soal -> Nomor Urut
  const bankNumberMap: Record<string, number> = {}
  const moduleCounters: Record<string, number> = {}

  allModuleQuestions?.forEach((q: any) => {
     if (!moduleCounters[q.module_id]) moduleCounters[q.module_id] = 0
     moduleCounters[q.module_id]++ // Hitung: 1, 2, 3...
     
     // Simpan nomor urutnya ke map
     bankNumberMap[q.id] = moduleCounters[q.module_id]
  })
  // -------------------------------------------------------

  // 3. Format Data untuk Frontend (Inject bankNumber)
  const questions = answers.map((ans: any) => ({
    id: ans.question.id,
    content: ans.question.content,
    explanation: ans.question.explanation,
    options: ans.question.options,
    module: ans.question.module,
    
    // 👇 INI KUNCINYA: Masukkan nomor urut hasil hitungan tadi
    bankNumber: bankNumberMap[ans.question.id] || 0 
  }))

  const initialAnswers: Record<string, string> = {}
  answers.forEach((a: any) => {
    if (a.selected_option_id) initialAnswers[a.question.id] = a.selected_option_id
  })

  return { session, questions, initialAnswers }
}

export async function saveEssayMastery(questionId: string, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const isMastered = score >= 70

  const { data: existing } = await supabase
    .from('user_mastery')
    .select('correct_count, incorrect_count')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()

  if (isMastered) {
    if (existing) {
      await supabase.from('user_mastery')
        .update({ correct_count: (existing.correct_count || 0) + 1, last_answered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('question_id', questionId)
    } else {
      await supabase.from('user_mastery')
        .insert({ user_id: user.id, question_id: questionId, correct_count: 1 })
    }
  } else {
    if (existing) {
      await supabase.from('user_mastery')
        .update({ incorrect_count: (existing.incorrect_count || 0) + 1, last_answered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('question_id', questionId)
    } else {
      await supabase.from('user_mastery')
        .insert({ user_id: user.id, question_id: questionId, incorrect_count: 1 })
    }
  }

  revalidatePath('/dashboard')
  return { success: true, mastered: isMastered }
}

export async function saveEssayAnswer(
  sessionId: string,
  questionId: string,
  answer: string,
  score: number,
  feedback: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('quiz_answers')
    .update({
      essay_answer: answer,
      ai_score: score,
      ai_feedback: feedback,
      is_correct: score >= 70,
      status: 'answered'
    })
    .eq('session_id', sessionId)
    .eq('question_id', questionId)

  if (error) throw error

  // Save to user_mastery
  await saveEssayMastery(questionId, score)

  return { success: true }
}

export async function submitEssayQuiz(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('ai_score')
    .eq('session_id', sessionId)

  if (!answers) throw new Error('Gagal memuat jawaban')

  const answered = answers.filter((a: any) => a.ai_score !== null)
  const totalScore = answered.reduce((acc, curr) => acc + (curr.ai_score || 0), 0)
  const avgScore = answered.length > 0 ? Math.round(totalScore / answered.length) : 0

  const { error } = await supabase
    .from('quiz_sessions')
    .update({
      status: 'completed',
      score: avgScore,
      completed_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (error) throw error

  revalidatePath('/dashboard')
  return { success: true }
}