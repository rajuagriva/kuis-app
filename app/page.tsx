import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Clock, Zap, CheckCircle, ArrowRight } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()

  // 1. CEK STATUS LOGIN
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white" suppressHydrationWarning>
      
      {/* --- NAVBAR SEDERHANA --- */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto" suppressHydrationWarning>
        <div className="flex items-center gap-2" suppressHydrationWarning>
          <div className="bg-indigo-600 p-2 rounded-lg" suppressHydrationWarning>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Kuis App</span>
        </div>
        <div className="space-x-4" suppressHydrationWarning>
          <Link 
            href="/login" 
            className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
          >
            Masuk
          </Link>
          <Link 
            href="/register" 
            className="text-sm font-medium bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-16 pb-32 overflow-hidden" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10" suppressHydrationWarning>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-8 border border-indigo-100" suppressHydrationWarning>
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2"></span>
            Platform Latihan Ujian #1
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
            Cara Terbaik Menguasai <br />
            <span className="text-transparent bg-clip-text gradient-to-r from-indigo-600 to-purple-600">
              Materi Perkuliahan
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Akses ribuan soal latihan, simulasi ujian dengan waktu nyata, dan pelajari pembahasan lengkap untuk nilai maksimal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4" suppressHydrationWarning>
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-full text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center"
            >
              Mulai Belajar Sekarang
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-bold rounded-full text-lg border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center"
            >
              Sudah Punya Akun?
            </Link>
          </div>
        </div>

        {/* Dekorasi Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10" suppressHydrationWarning>
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="py-24 bg-gray-50" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-6" suppressHydrationWarning>
          <div className="text-center mb-16" suppressHydrationWarning>
            <h2 className="text-3xl font-bold text-gray-900">Fitur Unggulan</h2>
            <p className="mt-4 text-gray-600">Semua yang Anda butuhkan untuk lulus ujian dengan nilai terbaik.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" suppressHydrationWarning>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow" suppressHydrationWarning>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6" suppressHydrationWarning>
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Simulasi Ujian</h3>
              <p className="text-gray-600 leading-relaxed">
                Latih manajemen waktu Anda dengan mode ujian yang dilengkapi timer otomatis seperti ujian sungguhan.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow" suppressHydrationWarning>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6" suppressHydrationWarning>
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mode Belajar Santai</h3>
              <p className="text-gray-600 leading-relaxed">
                Belajar tanpa tekanan. Lihat kunci jawaban dan pembahasan instan setelah memilih jawaban.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow" suppressHydrationWarning>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6" suppressHydrationWarning>
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Review & Pembahasan</h3>
              <p className="text-gray-600 leading-relaxed">
                Pelajari kesalahan Anda. Setiap soal dilengkapi pembahasan mendalam agar Anda paham konsepnya.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-12" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center" suppressHydrationWarning>
          <div className="flex items-center gap-2 mb-4 md:mb-0" suppressHydrationWarning>
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-900">Kuis App</span>
          </div>
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Aplikasi Ujian Online. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
