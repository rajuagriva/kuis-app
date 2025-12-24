'use server'

import { createClient } from '@/utils/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export async function getDetailedAnalytics() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Ambil Mata Kuliah yang diambil user
  const { data: enrollment } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', user.id)

  const allowedSubjectIds = enrollment?.map((e: any) => e.subject_id) || []
  if (allowedSubjectIds.length === 0) return []

  // 2. Ambil Struktur Hirarki (Subject -> Source -> Module)
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, code,
      sources (
        id, name, type,
        modules (
          id, name
        )
      )
    `)
    .in('id', allowedSubjectIds)
    .order('name')

  if (!subjects) return []

  // 3. Ambil SEMUA Soal (Flat List) untuk hitung statistik
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, module_id')
    .range(0, 9999)

  // 4. Ambil Mastery User
const { data: mastery, error: masteryError } = await supabase
    .from('user_mastery')
    .select('question_id, correct_count, incorrect_count')
    .eq('user_id', user.id)

  // LOG DEBUGGING
  console.log("🔍 DEBUG ANALYTICS:")
  // 👇 Sekarang variabel ini sudah ada, jadi tidak akan error lagi
  if (masteryError) {
    console.error("🔥 ERROR FETCH MASTERY:", masteryError.message) 
  } else {
    console.log("- User ID:", user.id)
    console.log("- Total Mastery Ditemukan:", mastery?.length)
  }

  // --- LOGIKA AGGREGASI DATA (PENGOLAHAN) ---
  
  // Buat Map untuk Mastery agar pencarian cepat (O(1))
  const masteryMap = new Map()
  mastery?.forEach((m: any) => {
    masteryMap.set(m.question_id, {
      correct: m.correct_count || 0,
      incorrect: m.incorrect_count || 0,
      isMastered: (m.correct_count || 0) >= 1 // Threshold 1
    })
  })

  // Proses Data
  const report = subjects.map((sub: any) => {
    let subTotalQ = 0
    let subMastered = 0

    const sources = sub.sources?.map((src: any) => {
      const modules = src.modules?.map((mod: any) => {
        // Cari soal milik modul ini
        const modQuestions = allQuestions?.filter((q: any) => q.module_id === mod.id) || []
        
        const totalQ = modQuestions.length
        let masteredCount = 0
        let totalAttempts = 0
        let totalCorrectAnswers = 0

        modQuestions.forEach((q: any) => {
          const m = masteryMap.get(q.id)
          if (m) {
            if (m.isMastered) masteredCount++
            totalAttempts += (m.correct + m.incorrect)
            totalCorrectAnswers += m.correct
          }
        })

        // Akumulasi ke Subject
        subTotalQ += totalQ
        subMastered += masteredCount

        return {
          id: mod.id,
          name: mod.name,
          totalQuestions: totalQ,
          mastered: masteredCount,
          progress: totalQ > 0 ? Math.round((masteredCount / totalQ) * 100) : 0,
          accuracy: totalAttempts > 0 ? Math.round((totalCorrectAnswers / totalAttempts) * 100) : 0
        }
      }) || []

      // Urutkan modul berdasarkan nama
      modules.sort((a: any, b: any) => a.name.localeCompare(b.name))

      return {
        id: src.id,
        name: src.name,
        type: src.type,
        modules: modules
      }
    }) || []

    return {
      id: sub.id,
      name: sub.name,
      code: sub.code,
      stats: {
        totalQuestions: subTotalQ,
        mastered: subMastered,
        progress: subTotalQ > 0 ? Math.round((subMastered / subTotalQ) * 100) : 0
      },
      sources: sources
    }
  })

  return report
}