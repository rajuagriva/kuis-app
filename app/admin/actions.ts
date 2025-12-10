'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Tipe data untuk struktur JSON yang diupload
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

// Helper untuk Cek atau Buat Data (Upsert Logic Manual)
async function getOrCreate(supabase: any, table: string, match: object, insertData: object) {
  // 1. Cek apakah data sudah ada?
  let query = supabase.from(table).select('id')
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value)
  }
  const { data: existing } = await query.single()

  // 2. Jika ada, kembalikan ID-nya
  if (existing) return existing.id

  // 3. Jika tidak, buat baru
  const { data: created, error } = await supabase
    .from(table)
    .insert({ ...match, ...insertData }) // Gabungkan data pencocokan & data baru
    .select('id')
    .single()

  if (error) throw new Error(`Gagal insert ke ${table}: ${error.message}`)
  return created.id
}

export async function uploadQuizData(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // 1. Cek Auth Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  // 2. Ambil File
  const file = formData.get('file') as File
  if (!file) return { success: false, message: 'File tidak ditemukan.' }

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return { success: false, message: 'Format JSON harus Array [].' }

    let totalQuestions = 0

    // 3. Loop Data dengan Logika Anti-Duplikat
    for (const subject of data) {
      // A. Matkul: Cek berdasarkan KODE
      const subjectId = await getOrCreate(
        supabase, 
        'subjects', 
        { code: subject.code }, 
        { name: subject.name }
      )

      if (subject.sources) {
        for (const source of subject.sources) {
           // B. Sumber: Cek berdasarkan NAMA + SubjectID
           const sourceId = await getOrCreate(
             supabase,
             'sources',
             { name: source.name, subject_id: subjectId },
             { type: source.type || 'exam' }
           )
           
           if (source.modules) {
             for (const mod of source.modules) {
               // C. Modul: Cek berdasarkan NAMA + SourceID
               const moduleId = await getOrCreate(
                 supabase,
                 'modules',
                 { name: mod.name, source_id: sourceId },
                 {}
               )

               if (mod.questions) {
                 for (const q of mod.questions) {
                   // D. Soal selalu insert baru (kecuali mau cek konten, tapi riskan berat)
                   const { data: newQ, error: qError } = await supabase
                     .from('questions')
                     .insert({ content: q.content, explanation: q.explanation, module_id: moduleId })
                     .select('id')
                     .single()

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
    return { success: true, message: `Sukses! ${totalQuestions} soal berhasil diproses (Duplikat digabungkan).` }

  } catch (error: any) {
    console.error('Upload Error:', error)
    return { success: false, message: error.message || 'Terjadi kesalahan sistem.' }
  }
}
// --- UPDATE TEMA ---
export async function updateTheme(config: { color: string; radius: number }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Simpan JSON ke kolom theme_config
  const { error } = await supabase
    .from('profiles')
    .update({
      theme_config: config
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/', 'layout') // Refresh seluruh aplikasi
  return { success: true }
}

// --- MANAJEMEN SOAL (CRUD) ---

// 1. Ambil Daftar Modul untuk Dropdown (PERBAIKAN: Tambah ID di select)
export async function getAdminModules() {
  const supabase = await createClient()
  
  // Perbaikan: Kita tambahkan 'id' di dalam source dan subject
  const { data, error } = await supabase
    .from('modules')
    .select(`
      id, 
      name, 
      source:sources (
        id,   
        name,
        subject:subjects (
          id,
          name
        )
      )
    `)
    .order('name')

  if (error) {
    console.error('Error fetching admin modules:', error.message)
    return []
  }
  return data
}

// 2. Ambil Soal berdasarkan Modul
export async function getQuestionsByModule(moduleId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('id, content, explanation') // Kita ambil content & explanation saja untuk diedit
    .eq('module_id', moduleId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error.message)
    return []
  }
  return data
}

// 3. Update Soal
export async function updateQuestion(id: string, content: string, explanation: string) {
  const supabase = await createClient()
  
  // Cek Auth Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('questions')
    .update({ content, explanation })
    .eq('id', id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/questions')
  return { success: true }
}

// 4. Hapus Soal
export async function deleteQuestion(id: string) {
  const supabase = await createClient()
  
  // Cek Auth Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/questions')
  return { success: true }
}

// FUNGSI BARU: Hapus Entity (Subject/Source/Module)
export async function deleteEntity(table: 'subjects' | 'sources' | 'modules', id: string) {
  const supabase = await createClient()

  // Cek Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Lakukan Penghapusan
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`Gagal menghapus ${table}:`, error)
    throw new Error(error.message)
  }

  // Refresh Halaman Admin
  revalidatePath('/admin/questions')
  return { success: true }
}