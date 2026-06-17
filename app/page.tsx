import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Clock, Zap, CheckCircle2, ArrowRight } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()

  // 1. CEK STATUS LOGIN
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden" suppressHydrationWarning>
      
      {/* Background Soft Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 bg-indigo-200 animate-pulse-soft"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-15 bg-violet-200 animate-pulse-soft"></div>
      
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full relative z-10" suppressHydrationWarning>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-wide">
            Let<span className="text-indigo-600">s</span>Ujian
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
          >
            Masuk
          </Link>
          <Link 
            href="/register" 
            className="text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            Mulai Belajar
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 z-10 flex-1 flex items-center" suppressHydrationWarning>
        <div className="max-w-4xl mx-auto px-6 text-center" suppressHydrationWarning>
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-ping"></span>
            Persiapan Latihan Ujian Juni 2026
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
            Kuasai Materi Kuliah dengan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
              Simulasi Ujian Pintar
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Latih kesiapan Anda menghadapi ujian tanggal 21 Juni & 27 Juni 2026. Lengkap dengan sistem bank soal terstruktur, mode belajar, dan latihan essay berbasis kecerdasan buatan (AI).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto sm:max-w-none" suppressHydrationWarning>
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-base transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 group"
            >
              Mulai Latihan Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-base border border-slate-200 transition-all flex items-center justify-center"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 bg-white border-t border-slate-100 relative z-10" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-6" suppressHydrationWarning>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" suppressHydrationWarning>
            
            <div className="glass-card p-8 rounded-3xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 group" suppressHydrationWarning>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-105 transition-transform duration-300" suppressHydrationWarning>
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Simulasi Ujian Real-Time</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Tantang diri Anda dengan batasan waktu nyata (timer) untuk melatih manajemen waktu pengerjaan seperti ujian asli.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 group" suppressHydrationWarning>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-105 transition-transform duration-300" suppressHydrationWarning>
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Mode Belajar Instan</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Belajar santai tanpa batasan waktu. Lihat kunci jawaban dan penjelasan mendalam segera setelah Anda menjawab soal.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 group" suppressHydrationWarning>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-105 transition-transform duration-300" suppressHydrationWarning>
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Latihan Essay AI</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                Ketik jawaban essay Anda (khusus matkul STSI4208) dan dapatkan nilai instan (skor 0-100) serta umpan balik dari AI Tutor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-10 relative z-10" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4" suppressHydrationWarning>
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <div className="p-1 rounded-lg bg-indigo-605">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">LetsUjian</span>
          </div>
          <p className="text-slate-400 text-xs" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} LetsUjian Online App. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
