import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardStats, getUserStats, getQuizHistory } from '@/app/quiz/actions'
import { Play, CheckCircle, BookOpen, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load Data Paralel
  const [userStats, subjectsStats, history] = await Promise.all([
    getUserStats(),     // Statistik Global (Total Kuis, Rata2)
    getDashboardStats(), // Statistik Per Matkul (8 Kartu)
    getQuizHistory()    // Riwayat Terakhir
  ])

  return (
    <div className="space-y-10 pb-10">
      
      {/* HEADER & STATS UTAMA */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Progres</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 mr-4"><BookOpen /></div>
            <div>
              <p className="text-sm text-gray-500">Total Kuis Dikerjakan</p>
              <h3 className="text-2xl font-bold">{userStats.totalQuiz}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 bg-green-100 rounded-lg text-green-600 mr-4"><BarChart3 /></div>
            <div>
              <p className="text-sm text-gray-500">Rata-Rata Nilai</p>
              <h3 className="text-2xl font-bold">{userStats.avgScore}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* --- BAGIAN UTAMA: 8 KARTU MATA KULIAH --- */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" />
          Target Penguasaan Materi
        </h2>
        <p className="text-gray-500 mb-6">
          Jawab benar 3x agar soal dianggap "Master". Kartu ini menunjukkan sisa soal yang belum dikuasai.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subjectsStats.map((sub: any) => {
            const progress = sub.total > 0 ? Math.round((sub.mastered / sub.total) * 100) : 0
            const isCompleted = sub.remaining === 0 && sub.total > 0

            return (
              <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 grow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">
                      {sub.code}
                    </span>
                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 [3rem]">
                    {sub.name}
                  </h3>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Master: {sub.mastered}</span>
                      <span>Sisa: <strong className="text-red-500">{sub.remaining}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  {sub.remaining > 0 ? (
                    <Link 
                      href={`/quiz/start-custom?mode=exam&subjectId=${sub.id}&count=20`}
                      className="flex items-center justify-center w-full py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Latihan (20 Soal)
                    </Link>
                  ) : (
                    <button disabled className="w-full py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium cursor-default">
                      Materi Selesai! 🎉
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- RIWAYAT (TABEL LAMA) --- */}
      {/* (Anda bisa menaruh tabel riwayat yang lama di sini jika masih mau ditampilkan) */}
      
    </div>
  )
}