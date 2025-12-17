'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// TIPE DATA & HELPER UPLOAD
// ============================================================================
interface QuestionOption {
  text: string
  isCorrect: boolean
}

interface Question {
  text: string
  explanation: string
  options: QuestionOption[]
}

interface QuizImportData {
  subject: string
  source: string
  module: string
  questions: Question[]
}

async function getOrCreate(supabase: any, table: string, match: object, insertData: object) {
  let query = supabase.from(table).select('id')
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value)
  }
  const { data: existing } = await query.single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from(table)
    .insert({ ...match, ...insertData })
    .select('id')
    .single()

  if (error) throw new Error(`Gagal insert ke ${table}: ${error.message}`)
  return created.id
}

// ============================================================================
// 1. UPLOAD QUIZ DATA
// ============================================================================
export async function uploadQuizData(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  const file = formData.get('file') as File
  if (!file) return { success: false, message: 'File tidak ditemukan.' }

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return { success: false, message: 'Format JSON harus Array [].' }

    let totalQuestions = 0

    for (const subject of data) {
      const subjectId = await getOrCreate(
        supabase, 'subjects', 
        { code: subject.code }, { name: subject.name }
      )

      if (subject.sources) {
        for (const source of subject.sources) {
           const sourceId = await getOrCreate(
             supabase, 'sources',
             { name: source.name, subject_id: subjectId },
             { type: source.type || 'exam' }
           )
           
           if (source.modules) {
             for (const mod of source.modules) {
               const moduleId = await getOrCreate(
                 supabase, 'modules',
                 { name: mod.name, source_id: sourceId }, {}
               )

               if (mod.questions) {
                 for (const q of mod.questions) {
                   const { data: newQ, error: qError } = await supabase
                     .from('questions')
                     .insert({ content: q.content, explanation: q.explanation, module_id: moduleId })
                     .select('id').single()

                   if (qError) throw qError
                   totalQuestions++

                   if (q.options) {
                     const optionsData = q.options.map((opt: any) => ({
                       question_id: newQ.id,
                       text: opt.text,
                       is_correct: opt.is_correct
                     }))
                     await supabase.from('options').insert(optionsData)
                   }
                 }
               }
             }
           }
        }
      }
    }

    revalidatePath('/admin/dashboard')
    return { success: true, message: `Sukses! ${totalQuestions} soal berhasil diproses.` }

  } catch (error: any) {
    console.error('Upload Error:', error)
    return { success: false, message: error.message || 'Terjadi kesalahan sistem.' }
  }
}

// ============================================================================
// 2. TEMA APLIKASI
// ============================================================================
export async function updateTheme(config: { color: string; radius: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('profiles')
    .update({ theme_config: config })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
  return { success: true }
}

// ============================================================================
// 3. MANAJEMEN SUBJECT, MODULE, SOAL (CRUD)
// ============================================================================

// Ambil Daftar Subject (Admin View)
export async function getAdminSubjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code, mastery_threshold')
    .order('name')

  if (error) {
    console.error('Error fetching admin subjects:', error.message)
    return []
  }
  return data || []
}

// Update Subject
export async function updateSubject(id: string, name: string, code: string, masteryThreshold: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('subjects')
    .update({ name, code, mastery_threshold: masteryThreshold })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/subjects')
  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
  return { success: true }
}

// Ambil Daftar Modul
export async function getAdminModules() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select(`
      id, name, 
      source:sources (
        id, name,
        subject:subjects (id, name)
      )
    `)
    .order('name')

  if (error) return []
  return data
}

// Ambil Soal by Modul
export async function getQuestionsByModule(moduleId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('id, content, explanation')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

// Update Soal
export async function updateQuestion(id: string, content: string, explanation: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('questions').update({ content, explanation }).eq('id', id)
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/questions')
  return { success: true }
}

// Delete Soal
export async function deleteQuestion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/questions')
  return { success: true }
}

// Delete Entity (Subject/Source/Module)
export async function deleteEntity(table: 'subjects' | 'sources' | 'modules', id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/questions')
  return { success: true }
}

// ============================================================================
// 4. MANAJEMEN ENROLLMENT (PENDAFTARAN MATKUL)
// ============================================================================

// Ambil Semua Siswa
export async function getAllStudents() {
  const supabase = await createClient()
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }

  // Filter: hanya return user yang BUKAN admin
  return profiles?.filter(p => p.role !== 'admin') || []
}

// Ambil Matkul User
export async function getStudentEnrollments(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_subjects')
    .select('subject_id')
    .eq('user_id', userId)

  if (error) return []
  return data.map(d => d.subject_id)
}

// Toggle Enrollment (Versi Aman & Lengkap)
export async function toggleStudentEnrollment(userId: string, subjectId: string, isEnroll: boolean) {
  const supabase = await createClient()

  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Cek Apakah User adalah Admin
  const { data: adminCheck } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminCheck?.role !== 'admin') throw new Error('Anda bukan Admin. Akses ditolak.')

  if (isEnroll) {
    // INSERT
    const { error } = await supabase
      .from('student_subjects')
      .insert({ user_id: userId, subject_id: subjectId })
      
    // Abaikan error duplicate key (23505)
    if (error && error.code !== '23505') throw new Error(error.message)

  } else {
    // DELETE
    const { error } = await supabase
      .from('student_subjects')
      .delete()
      .eq('user_id', userId)
      .eq('subject_id', subjectId)

    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/enrollment')
  return { success: true }
}