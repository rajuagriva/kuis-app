import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Cek apakah user ada (opsional)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 2. Hapus Sesi Login (Logout)
    await supabase.auth.signOut()
  }

  // 3. Bersihkan Cache Data Lama
  revalidatePath('/', 'layout')

  // 4. Lempar kembali ke halaman Login (dan replace history agar tidak bisa di-back)
  return NextResponse.redirect(new URL('/login', req.url), {
    status: 302,
  })
}