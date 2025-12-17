'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. DEFINISIKAN TIPE DATA (PENTING!)
export type ProfileState = {
  message?: string
  error?: string
  success?: string
}

// 2. GUNAKAN TIPE TERSEBUT DI SINI
export async function updateProfile(prevState: any, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const fullName = formData.get('fullName') as string
  
  if (!fullName || fullName.trim().length < 3) {
    return { error: 'Nama lengkap minimal 3 karakter.' }
  }

  // Update tabel profiles
  const { error } = await supabase
    .from('profiles')
    .update({ 
      full_name: fullName.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('Update profile error:', error)
    return { error: 'Gagal memperbarui profil.' }
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')
  
  return { success: 'Profil berhasil diperbarui!' }
}

export async function getProfileStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Ambil Data Profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 2. Hitung Statistik Manual
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('score, status')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalQuiz = sessions?.length || 0
  const totalScore = sessions?.reduce((acc, curr) => acc + (curr.score || 0), 0) || 0
  const avgScore = totalQuiz > 0 ? Math.round(totalScore / totalQuiz) : 0

  let level = "Pemula"
  if (totalScore > 500) level = "Siswa Rajin"
  if (totalScore > 1000) level = "Bintang Kelas"
  if (totalScore > 2000) level = "Sepuh Kuis 👑"

  return {
    user,
    profile,
    stats: {
      totalQuiz,
      totalScore,
      avgScore,
      level
    }
  }
}