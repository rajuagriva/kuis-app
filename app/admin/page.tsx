import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminSubjects, getAdminModules } from '@/app/admin/actions'
import AdminPanel from '@/components/admin-panel'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Cek User & Role on the Server
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // 2. Fetch initial subjects & modules
  const [subjects, modules] = await Promise.all([
    getAdminSubjects(),
    getAdminModules()
  ])

  return (
    <AdminPanel initialSubjects={subjects} initialModules={modules} />
  )
}