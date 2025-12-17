import { createClient } from '@/utils/supabase/server'
import { getAllStudents, getAdminSubjects } from '@/app/admin/actions'
import { redirect } from 'next/navigation'
import EnrollmentClient from './enrollment-client' // Kita buat client component terpisah

export default async function AdminEnrollmentPage() {
  const supabase = await createClient()
  
  // 1. Cek Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // 2. Ambil Data (Siswa & Matkul)
  const students = await getAllStudents()
  const subjects = await getAdminSubjects()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Akses Siswa</h1>
        <p className="text-gray-500">Atur mata kuliah apa saja yang boleh diakses oleh setiap siswa.</p>
      </div>

      {/* Kita lempar data ke Client Component agar interaktif */}
      <EnrollmentClient students={students} subjects={subjects} />
    </div>
  )
}