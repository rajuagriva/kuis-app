import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { LogOut, LayoutDashboard, ShieldCheck, BookOpen } from 'lucide-react' // Tambah icon BookOpen

export default async function Navbar() {
  const supabase = await createClient()

  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null 

  // 2. Cek Role User
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* LOGO & MENU KIRI */}
          <div className="flex">
            <div className="shrink-0 flex items-center">
              <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isAdmin ? 'bg-indigo-600' : 'bg-green-600'}`}>
                   {isAdmin ? <ShieldCheck className="w-6 h-6 text-white" /> : <LayoutDashboard className="w-6 h-6 text-white" />}
                </div>
                <span className="text-xl font-bold text-gray-900 hidden md:block">
                  {isAdmin ? 'Admin Panel' : 'Kuis App'}
                </span>
              </Link>
            </div>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {isAdmin ? (
                /* === MENU KHUSUS ADMIN (LENGKAP) === */
                <>
                  <NavLink href="/admin/dashboard">Dashboard</NavLink>
                  
                  {/* Menu Baru Disisipkan Disini 👇 */}
                  <NavLink href="/admin/subjects">Atur Matkul</NavLink> 
                  
                  {/* Menu Lama Tetap Ada 👇 */}
                  <NavLink href="/admin/upload">Import Soal</NavLink>
                  <NavLink href="/admin/questions">Edit Soal</NavLink>
                  <NavLink href="/admin/theme">Tampilan</NavLink>
                </>
              ) : (
                /* === MENU KHUSUS PESERTA === */
                <>
                  <NavLink href="/dashboard">Dashboard</NavLink>
                </>
              )}
            </div>
          </div>

          {/* MENU KANAN (User Info & Logout) */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900">
                {profile?.full_name || 'Pengguna'}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {isAdmin ? 'Administrator' : 'Peserta'}
              </span>
            </div>
            
            <div className="h-8 w-px bg-gray-200 mx-1"></div>

            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Keluar / Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </nav>
  )
}

// Komponen Kecil untuk Link agar rapi
function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link 
      href={href}
      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:border-b-2 hover:border-indigo-600 h-full border-b-2 border-transparent transition-all"
    >
      {children}
    </Link>
  )
}