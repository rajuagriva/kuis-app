import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { LogOut, LayoutDashboard, ShieldCheck, GraduationCap, BarChart3, User, Settings } from 'lucide-react'

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
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* LOGO & MENU KIRI */}
          <div className="flex">
            <div className="shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black text-slate-900 tracking-wide hidden md:block">
                  Let<span className="text-indigo-600">s</span>Ujian
                </span>
              </Link>
            </div>
            
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <NavLink href="/dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </NavLink>
              <NavLink href="/analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analisis
              </NavLink>
              
              {isAdmin && (
                <NavLink href="/admin">
                  <Settings className="w-4 h-4 mr-2" />
                  Kelola Ujian
                </NavLink>
              )}
            </div>
          </div>

          {/* MENU KANAN (User Info & Logout) */}
          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/50 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-200 transition-all duration-300 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-xs font-bold text-slate-800">
                  {profile?.full_name || 'Pengguna'}
                </span>
                <span className="text-[10px] text-indigo-650 font-semibold uppercase tracking-wider">
                  {isAdmin ? 'Admin' : 'Peserta'}
                </span>
              </div>
            </Link>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-300"
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

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link 
      href={href}
      className="inline-flex items-center px-1 pt-1 text-sm font-semibold text-slate-500 hover:text-indigo-650 hover:border-b-2 hover:border-indigo-600 h-full border-b-2 border-transparent transition-all duration-300"
    >
      {children}
    </Link>
  )
}