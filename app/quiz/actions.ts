'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'

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
  // Kita pakai helper shuffleArray (pastikan fungsi ini ada di file Anda)
  // Kalau tidak ada, pakai logic simple: .sort(() => 0.5 - Math.random())
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
  // Ini penting agar urutan soal tersimpan
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

  // 8. Return ID Session (Jangan redirect di server action jika dipanggil via Client Component)
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
// STATISTIK DASHBOARD (FILTERED BY ENROLLMENT)
// ============================================================================
export async function getDetailedStats() {
  // 1. Matikan Cache (Agar data selalu update saat soal ditambah)
  noStore() 

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { global: null, subjects: [] }

  // 2. Ambil Mata Kuliah yang diambil siswa
  const { data: enrollment } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', user.id)
  
  const allowedSubjectIds = enrollment?.map((e: any) => e.subject_id) || []

  // Jika belum ambil matkul, return 0 semua
  if (allowedSubjectIds.length === 0) {
     return { 
       global: { totalQuestions: 0, mastered: 0, progress: 0, remaining: 0 }, 
       subjects: [] 
     }
  }

  // 3. Ambil Data Subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold')
    .in('id', allowedSubjectIds)

  if (!subjects) return { global: null, subjects: [] }

  // 4. Ambil SEMUA Soal (Untuk hitung total)
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, module:modules!inner(source:sources!inner(subject_id))')
  
  // 5. Ambil Mastery User (Soal yang sudah dikuasai)
  const { data: allMastery } = await supabase
    .from('user_mastery')
    .select('correct_count, question_id, question:questions!inner(module:modules!inner(source:sources!inner(subject_id)))')
    .eq('user_id', user.id)

  // 6. Ambil Sesi Kuis Selesai (Untuk hitung rata-rata nilai)
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id, score')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  // -- Helper: Petakan Session ID ke Subject ID --
  // Supaya kita tahu "Sesi Kuis X" itu milik "Matkul Apa"
  const sessionIds = sessions?.map(s => s.id) || []
  let sessionSubjectMap: Record<string, string> = {}
  
  if (sessionIds.length > 0) {
    // Kita cek isi jawaban kuis untuk tahu matkulnya
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select(`session_id, question:questions!inner(module:modules!inner(source:sources!inner(subject_id)))`)
      .in('session_id', sessionIds)
    
    // Mapping session_id -> subject_id
    answers?.forEach((ans: any) => {
      if (ans.session_id && ans.question?.module?.source?.subject_id) {
        sessionSubjectMap[ans.session_id] = ans.question.module.source.subject_id
      }
    })
  }

  // 7. MULAI PERHITUNGAN (Ini bagian yang tadi hilang/error)
  let globalTotalQ = 0
  let globalMastered = 0

  // Kita loop setiap mata kuliah untuk hitung statistik per matkul
  const stats = subjects.map((sub: any) => {
    const threshold = sub.mastery_threshold || 3 // Default mastery butuh 3x benar
    
    // Filter soal milik matkul ini
    const subQuestions = allQuestions?.filter((q: any) => q.module?.source?.subject_id === sub.id) || []
    
    // Filter mastery milik matkul ini
    const subMastery = allMastery?.filter((m: any) => {
       const isBelong = m.question?.module?.source?.subject_id === sub.id
       const isMaster = (m.correct_count || 0) >= threshold 
       return isBelong && isMaster
    }) || []
    
    // Filter sesi kuis milik matkul ini
    const subSessions = sessions?.filter((s: any) => sessionSubjectMap[s.id] === sub.id) || []
    
    // Hitung rata-rata nilai
    const totalQuiz = subSessions.length
    const avgScore = totalQuiz > 0 
      ? Math.round(subSessions.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / totalQuiz)
      : 0

    // Akumulasi ke Global Stats
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

  // 8. Return Hasil Akhir
  return {
    global: {
      totalQuestions: globalTotalQ,
      mastered: globalMastered,
      progress: globalTotalQ > 0 ? Math.round((globalMastered / globalTotalQ) * 100) : 0,
      remaining: globalTotalQ - globalMastered
    },
    subjects: stats // Variabel stats sudah didefinisikan di poin no 7
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