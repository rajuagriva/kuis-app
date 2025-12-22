'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
    .select('id, name, code')
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
export async function createQuizSession({ 
  subjectId, moduleIds, count = 10, mode = 'study' 
}: { 
  subjectId?: string, moduleIds?: string[], count?: number, mode?: 'study' | 'exam' 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let targetModuleIds: string[] = []
  let quizTitle = "Latihan Kuis"
  let threshold = 3 // Default threshold

  if (subjectId) {
    // --- KEAMANAN: Cek apakah user BOLEH ambil subject ini ---
    // (Pengecekan ini tetap jalan meskipun user memilih modul spesifik)
    const { data: enrolled } = await supabase
        .from('student_subjects')
        .select('id')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
        .single()
    
    if (!enrolled) throw new Error('Anda tidak memiliki akses ke mata kuliah ini.')

    const { data: sub } = await supabase.from('subjects').select('name, mastery_threshold').eq('id', subjectId).single()
    if (sub) {
      quizTitle = `Latihan: ${sub.name}`
      if (sub.mastery_threshold) threshold = sub.mastery_threshold
    }

    // --- LOGIKA UTAMA (UPDATE): PRIORITAS MODUL VS SUBJECT ---
    if (moduleIds && moduleIds.length > 0) {
      // OPSI A: User memilih Modul Spesifik
      // Kita gunakan modul yang dipilih user saja
      targetModuleIds = moduleIds
      
      // Opsional: Tambahkan info modul ke judul kuis agar lebih jelas
      if (moduleIds.length === 1) {
         // Jika cuma 1 modul, coba ambil namanya buat judul (biar keren dikit)
         const { data: mName } = await supabase.from('modules').select('name').eq('id', moduleIds[0]).single()
         if (mName) quizTitle = `${mName.name}`
      } else {
         quizTitle = `${quizTitle} (Modul Terpilih)`
      }

    } else {
      // OPSI B: User TIDAK memilih modul (Memilih Subject saja / Semua Modul)
      // Ambil SEMUA modul di dalam subject tersebut (Fallback ke perilaku lama)
      const { data: modules } = await supabase
        .from('modules')
        .select('id, source:sources!inner(subject_id)')
        .eq('source.subject_id', subjectId)
      if (modules) targetModuleIds = modules.map((m: any) => m.id)
    }
  
  } else if (moduleIds && moduleIds.length > 0) {
    // Fallback jika subjectId entah kenapa kosong tapi modul ada
    quizTitle = "Kuis Custom Modul"
    targetModuleIds = moduleIds
    
    // Ambil threshold dari mata pelajaran pertama jika menggunakan modul
    const { data: firstModule } = await supabase
      .from('modules')
      .select('source:sources(subject:subjects(mastery_threshold))')
      .eq('id', moduleIds[0])
      .single()
    
    const potentialThreshold = (firstModule as any)?.source?.subject?.mastery_threshold
    if (potentialThreshold) threshold = potentialThreshold
  }

  if (targetModuleIds.length === 0) throw new Error('Tidak ada modul yang dipilih atau tersedia.')

  // 1. Ambil Semua Soal yang tersedia
  const { data: allQuestionsRaw } = await supabase
    .from('questions')
    .select('id, module_id')
    .in('module_id', targetModuleIds)
  
  if (!allQuestionsRaw || allQuestionsRaw.length === 0) throw new Error('Soal tidak ditemukan.')

  // 2. Ambil Soal yang SUDAH MASTER (untuk difilter)
  const { data: masteredRecords } = await supabase
    .from('user_mastery')
    .select('question_id')
    .eq('user_id', user.id)
    .gte('correct_count', threshold)

  const masteredIds = new Set(masteredRecords?.map((m: any) => m.question_id) || [])

  // 3. Filter: Hanya ambil soal yang BELUM Master
  const availableQuestions = allQuestionsRaw.filter((q: any) => !masteredIds.has(q.id))

  if (availableQuestions.length === 0) {
    throw new Error('Hebat! Semua soal di kategori ini sudah Anda kuasai (Master).')
  }

  // Distribusi Adil (Stratified) dari soal yang belum dikuasai
  const questionsByModule: Record<string, string[]> = {}
  targetModuleIds.forEach(mid => questionsByModule[mid] = [])
  availableQuestions.forEach((q: any) => {
    if (questionsByModule[q.module_id]) questionsByModule[q.module_id].push(q.id)
  })

  const activeModules = targetModuleIds.filter(mid => questionsByModule[mid].length > 0)
  if (activeModules.length === 0) throw new Error('Modul kosong atau semua soal sudah dikuasai.')

  let finalSelectedIds: string[] = []
  let remainingQuota = count
  
  while (remainingQuota > 0 && activeModules.length > 0) {
    const quotaPerModule = Math.ceil(remainingQuota / activeModules.length)
    for (let i = activeModules.length - 1; i >= 0; i--) {
      const modId = activeModules[i]
      const availableQs = questionsByModule[modId]
      const shuffled = shuffleArray(availableQs)
      const takeCount = Math.min(quotaPerModule, shuffled.length)
      const taken = shuffled.slice(0, takeCount)
      
      finalSelectedIds.push(...taken)
      remainingQuota -= taken.length
      questionsByModule[modId] = shuffled.slice(takeCount)
      
      if (questionsByModule[modId].length === 0) {
        activeModules.splice(i, 1)
      }
      if (remainingQuota <= 0) break
    }
  }

  // Buat Sesi
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: user.id,
      mode: mode, 
      status: 'in_progress',
      quiz_title: quizTitle,
      started_at: new Date().toISOString(),
      settings: { total_request: count, distribution: 'smart' }
    })
    .select().single()

  if (sessionError) throw new Error(sessionError.message)

  // Insert Jawaban Kosong
  const finalShuffled = shuffleArray(finalSelectedIds)
  const answerInserts = finalShuffled.map((qid, index) => ({
    session_id: session.id,
    question_id: qid,
    order_number: index + 1,
    status: 'unanswered'
  }))

  const { error: ansError } = await supabase.from('quiz_answers').insert(answerInserts)
  if (ansError) throw new Error(ansError.message)

  return { sessionId: session.id }
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
// STATISTIK DASHBOARD (FILTERED BY ENROLLMENT)
// ============================================================================
export async function getDetailedStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { global: null, subjects: [] }

  const { data: enrollment } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', user.id)
  
  const allowedSubjectIds = enrollment?.map((e: any) => e.subject_id) || []
  if (allowedSubjectIds.length === 0) {
     return { 
       global: { totalQuestions: 0, mastered: 0, progress: 0, remaining: 0 }, 
       subjects: [] 
     }
  }

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold')
    .in('id', allowedSubjectIds)

  if (!subjects) return { global: null, subjects: [] }

  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, module:modules!inner(source:sources!inner(subject_id))')
  
  const { data: allMastery } = await supabase
    .from('user_mastery')
    .select('correct_count, question_id, question:questions!inner(module:modules!inner(source:sources!inner(subject_id)))')
    .eq('user_id', user.id)

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score')
    .eq('user_id', user.id)
    .eq('status', 'completed')

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

  let globalTotalQ = 0
  let globalMastered = 0

  const stats = subjects.map((sub: any) => {
    const threshold = sub.mastery_threshold || 3
    const subQuestions = allQuestions?.filter((q: any) => q.module?.source?.subject_id === sub.id) || []
    
    const subMastery = allMastery?.filter((m: any) => {
       const isBelong = m.question?.module?.source?.subject_id === sub.id
       const isMaster = (m.correct_count || 0) >= threshold 
       return isBelong && isMaster
    }) || []
    
    const subSessions = sessions?.filter((s: any) => sessionSubjectMap[s.id] === sub.id) || []
    const totalQuiz = subSessions.length
    const avgScore = totalQuiz > 0 
      ? Math.round(subSessions.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / totalQuiz)
      : 0

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
      masteryThreshold: threshold
    }
  })

  return {
    global: {
      totalQuestions: globalTotalQ,
      mastered: globalMastered,
      progress: globalTotalQ > 0 ? Math.round((globalMastered / globalTotalQ) * 100) : 0,
      remaining: globalTotalQ - globalMastered
    },
    subjects: stats
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