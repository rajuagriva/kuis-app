'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// --- FUNGSI LOGIN (TIDAK BERUBAH) ---
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Email atau Password salah')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// --- FUNGSI SIGNUP (YANG KITA UBAH) ---
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // 1. Ambil data form
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !fullName) {
    return redirect('/register?message=Mohon lengkapi semua data')
  }

  // 2. Buat Akun Auth (Login)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (authError) {
    console.error(authError)
    return redirect('/register?message=Pendaftaran gagal: ' + authError.message)
  }

  // 3. INSERT MANUAL KE PROFIL (INI BAGIAN BARUNYA)
  // Kita masukkan data diri secara manual agar tidak error Database/Enum
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,        // ID disamakan dengan akun login
        full_name: fullName,         // Nama dari input
        role: 'user'                 // Default role peserta
      })
    
    // Jika gagal simpan profil, kita catat di console server (tapi user tetap bisa login)
    if (profileError) {
      console.error('Gagal menyimpan profil:', profileError)
    }
  }

  // 4. Sukses -> Masuk Dashboard
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}