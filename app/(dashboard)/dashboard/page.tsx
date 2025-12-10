import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getUserStats, getSubjects, getQuizHistory } from '@/app/quiz/actions'
import QuizSelector from '@/components/quiz-selector'
import Link from 'next/link'
import { Trophy, BookOpen, Clock, ChevronRight, History } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch Semua Data secara Paralel (Stats, Subjects, History)
  const [stats, subjects, history] = await Promise.all([
    getUserStats(),
    getSubjects(),
    getQuizHistory()
  ])

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Peserta</h1>
        <p className="text-gray-600">Selamat datang kembali, siap untuk latihan hari ini?</p>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="shrink-0 bg-indigo-100 rounded-md p-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Total Kuis Selesai</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.totalQuiz}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100">
          <div className="p-5 flex items-center">
            <div className="shrink-0 bg-green-100 rounded-md p-3">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Rata-rata Nilai</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.avgScore}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Utama: Selector & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Quiz Selector & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Quiz Selector */}
          <QuizSelector initialSubjects={subjects} />

          {/* 2. TABEL RIWAYAT (FITUR BARU) */}
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-gray-500" />
                Riwayat Aktivitas
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p>Belum ada riwayat ujian. Yuk mulai kerjakan kuis pertama!</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mata Kuliah / Modul</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Detail</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((session: any) => {
                      // Formatting Tanggal
                      const date = new Date(session.created_at).toLocaleString('id-ID', {
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' // <-- Ini yang memunculkan jam
                      })
                      
                      // Formatting Status
                      const isCompleted = session.status === 'completed'
                      const statusClass = isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      const statusLabel = isCompleted ? 'Selesai' : 'Proses'

                      // Ambil Data Join (Type Safety diabaikan sebentar untuk kemudahan)
// Logic Tampilan Judul
let displaySubject = 'Unknown Subject'
let displayModule = 'Unknown Module'

if (session.quiz_title) {
  // Jika ini Kuis Custom (ada quiz_title), kita pecah judulnya
  // Format tadi: "KODE: Modul A, Modul B"
  const parts = session.quiz_title.split(':')
  if (parts.length >= 2) {
    displaySubject = parts[0].trim() // Kode Matkul
    displayModule = parts[1].trim()  // Daftar Modul
  } else {
    displaySubject = 'Kuis Custom'
    displayModule = session.quiz_title
  }
} else if (session.module) {
  // Jika Kuis Lama (Standard)
  displaySubject = session.module.source?.subject?.name || 'Unknown'
  displayModule = session.module.name || 'Unknown'
}

                      return (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              {date}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{displaySubject}</div>
                            <div className="text-sm text-gray-500">{displayModule}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">{session.score ?? '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {isCompleted ? (
                              <Link href={`/result/${session.id}`} className="text-primary hover:text-indigo-900 flex items-center justify-end">
                                Detail <ChevronRight className="w-4 h-4 ml-1" />
                              </Link>
                            ) : (
                              <span className="text-gray-400 cursor-not-allowed">Lanjut</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        
        {/* Kolom Kanan: Sidebar Info */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100 h-fit">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
            <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded mr-2">TIPS</span>
            Cara Belajar Efektif
          </h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-3 leading-relaxed">
            <li>Kerjakan soal tanpa melihat kunci jawaban terlebih dahulu.</li>
            <li>Gunakan fitur <strong>Review</strong> di riwayat untuk membaca pembahasan soal yang salah.</li>
            <li>Ulangi modul yang nilainya masih di bawah 70.</li>
            <li>Istirahat 5 menit setiap 25 menit belajar (Teknik Pomodoro).</li>
          </ul>
        </div>
      </div>
    </div>
  )
}