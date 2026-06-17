import Link from 'next/link'
import { signup } from '@/app/login/actions'
import { GraduationCap } from 'lucide-react'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params?.message

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" suppressHydrationWarning>
      
      {/* Background Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-15 bg-indigo-200"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-15 bg-violet-200"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="p-2 rounded-xl bg-indigo-600 shadow-md group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-wide">LetsUjian</span>
        </Link>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Buat Akun Baru
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Silakan isi data untuk memulai latihan ujian Anda
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-xl bg-white">
          
          <form className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Nama Lengkap
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                className="block w-full rounded-xl glass-input px-4 py-3 text-sm placeholder-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nama@email.com"
                className="block w-full rounded-xl glass-input px-4 py-3 text-sm placeholder-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="block w-full rounded-xl glass-input px-4 py-3 text-sm placeholder-slate-400"
              />
            </div>

            {/* Error Message */}
            {message && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 animate-in fade-in slide-in-from-top-2">
                <div className="text-xs text-red-600 font-semibold">
                  {message}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                formAction={signup}
                className="flex w-full justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-4 text-sm font-black text-white shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.01]"
              >
                Daftar Sekarang
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
              Sudah punya akun?
            </div>
            <div className="mt-4 text-center">
              <Link 
                href="/login" 
                className="inline-flex justify-center w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
              >
                Masuk ke Akun
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}