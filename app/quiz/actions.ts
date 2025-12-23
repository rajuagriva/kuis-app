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

  // 1. Cek dulu user terdaftar di matkul apa saja
  const { data: enrollment } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', user.id)
  
  // Jika tidak ada enrollment, return kosong
  if (!enrollment || enrollment.length === 0) return []

  const allowedSubjectIds = enrollment.map((e: any) => e.subject_id)

  // 2. Ambil hanya subject yang ID-nya ada di daftar enrollment
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold')
    .in('id', allowedSubjectIds) 
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
  mode: 'practice' | 'exam' | 'study',
  config: { 
    subjectId?: string; 
    topicId?: string; // module_id
    count: number 
  }
) {
  // 1. Matikan Cache agar selalu ambil soal terbaru
  noStore()

  console.log("🚀 Memulai createQuizSession...", { mode, config })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // 2. Query Soal dengan Relasi Bertingkat (Chain)
  // Kita ambil ID soal dulu
  let query = supabase
    .from('questions')
    .select(`
      id,
      module:modules!inner (
        id,
        source:sources!inner (
          id,
          subject_id
        )
      )
    `)

  // 3. Filter Berdasarkan Subject ID (Jika ada di URL)
  if (config.subjectId) {
    // Filter soal yang punya module -> source -> subject_id sesuai request
    query = query.eq('module.source.subject_id', config.subjectId)
  }

  // 4. Filter Berdasarkan Topic/Module ID (Jika ada)
  if (config.topicId) {
    query = query.eq('module_id', config.topicId)
  }

  const { data: questionsData, error: questionsError } = await query

  if (questionsError) {
    console.error("🔥 Error Fetch Soal:", questionsError)
    return { error: 'Gagal mengambil data soal dari database.' }
  }

  // Cek apakah soal ditemukan
  if (!questionsData || questionsData.length === 0) {
    console.warn("⚠️ Soal Kosong! Pastikan Subject ID benar dan Soal sudah diinput.")
    return { error: 'Belum ada soal tersedia untuk mata kuliah ini.' }
  }

  console.log(`✅ Ditemukan ${questionsData.length} soal potensial.`)

  // 5. Acak Soal & Batasi Jumlah (Limit)
  const shuffled = questionsData.sort(() => 0.5 - Math.random())
  const selectedQuestions = shuffled.slice(0, config.count)
  
  const questionIds = selectedQuestions.map(q => q.id)

  // 6. Buat Session Baru
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: mode,
      total_questions: questionIds.length,
      current_question_index: 0,
      score: 0,
      status: 'in_progress',
      settings: config // Simpan config buat history
    })
    .select()
    .single()

  if (sessionError || !session) {
    console.error("🔥 Error Create Session:", sessionError)
    return { error: 'Gagal membuat sesi kuis baru.' }
  }

  // 7. Simpan Daftar Soal ke Tabel `quiz_answers` (sebagai placeholder)
  const answerInserts = questionIds.map((qId, index) => ({
    session_id: session.id,
    question_id: qId,
    order: index,
    status: 'unanswered'
  }))

  const { error: answersError } = await supabase
    .from('quiz_answers')
    .insert(answerInserts)

  if (answersError) {
    console.error("🔥 Error Insert Answers:", answersError)
    return { error: 'Gagal menyiapkan lembar jawaban.' }
  }

  console.log("🎉 Quiz Session Berhasil Dibuat:", session.id)

  // 8. Return ID Session
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

  const questionIds = Object.keys(answers)
  if (questionIds.length === 0) throw new Error('Tidak ada jawaban')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, content, options(id, text, is_correct)')
    .in('id', questionIds)

  if (!questions) throw new Error('Gagal memuat soal')

  let correctCount = 0
  const masteryUpdates = []

  for (const qId of questionIds) {
    const selectedOptId = answers[qId]
    const question = questions.find((q: any) => q.id === qId)
    
    if (question && question.options) {
        const correctOption = question.options.find((o: any) => o.is_correct)
        const isCorrect = correctOption?.id === selectedOptId
        if (isCorrect) correctCount++

        await supabase
          .from('quiz_answers')
          .update({
             selected_option_id: selectedOptId,
             is_correct: isCorrect,
             status: 'answered'
          })
          .eq('session_id', sessionId)
          .eq('question_id', qId)

        if (isCorrect) masteryUpdates.push(qId)
    }
  }

  const score = Math.round((correctCount / questionIds.length) * 100)

  await supabase.from('quiz_sessions')
    .update({ status: 'completed', score, completed_at: new Date().toISOString() })
    .eq('id', sessionId)

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

// Result
export async function getQuizResult(sessionId: string) {
  const supabase = await createClient()
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select(`*, quiz_title, module:modules(name, source:sources(name, subject:subjects(name, code)))`)
    .eq('id', sessionId).single()

  if (!session) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (session.user_id !== user?.id) return null 

  const { data: answers } = await supabase
    .from('quiz_answers')
    .select(`id, selected_option_id, is_correct, question:questions(id, content, explanation, options(id, text, is_correct))`)
    .eq('session_id', sessionId)

  return { session, reviews: answers }
}

// HISTORY: TAMPILKAN HANYA MATKUL YANG DI-ENROLL
// ============================================================================
export async function getQuizHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: enrollment } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', user.id)
  
  const allowedSubjectIds = new Set(enrollment?.map((e: any) => e.subject_id) || [])
  if (allowedSubjectIds.size === 0) return []

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
  }).filter((item: any) => item && allowedSubjectIds.has(item.module.source.subject.id))
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