import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardStats, getUserStats, getQuizHistory, getSubjects } from '@/app/quiz/actions'
import { Play, CheckCircle, BookOpen, BarChart3, List, History, Award } from 'lucide-react'
import Link from 'next/link'
import QuizSelector from '@/components/quiz-selector'
import ScoreChart from '@/components/score-chart'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [userStats, subjectsStats, history, subjects] = await Promise.all([
    getUserStats(),     
    getDashboardStats(), 
    getQuizHistory(),
    getSubjects()
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* 1. HEADER GRID (STATS + GRAFIK) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: 2 Kartu Statistik (Disusun Vertikal) */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-full">
          {/* Kartu 1: Total Kuis */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center flex-1 transition-transform hover:scale-[1.02]">
            <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600 mr-5">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Kuis</p>
              <h3 className="text-4xl font-extrabold text-gray-900 mt-1">{userStats.totalQuiz}</h3>
              <p className="text-xs text-gray-400 mt-1">Kali pengerjaan</p>
            </div>
          </div>
          
          {/* Kartu 2: Rata-Rata */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center flex-1 transition-transform hover:scale-[1.02]">
            <div className="p-4 bg-green-50 rounded-xl text-green-600 mr-5">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rata-Rata Nilai</p>
              <h3 className="text-4xl font-extrabold text-gray-900 mt-1">{userStats.avgScore}</h3>
              <p className="text-xs text-gray-400 mt-1">Dari seluruh kuis</p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Grafik (Mengisi sisa ruang) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 [320px]">
           <ScoreChart data={history} />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 2. TARGET PENGUASAAN MATERI (GRID KARTU) */}
      <div>
        <div className="flex items-center mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg mr-3">
            <CheckCircle className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Target Penguasaan Materi</h2>
            <p className="text-sm text-gray-500">Jawab benar 3x agar soal dianggap "Master".</p>
          </div>
        </div>

        {/* GRID 4 KOLOM AGAR RAPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjectsStats.length > 0 ? subjectsStats.map((sub: any) => {
            const progress = sub.total > 0 ? Math.round((sub.mastered / sub.total) * 100) : 0
            const isCompleted = sub.remaining === 0 && sub.total > 0

            return (
              <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col h-full">
                {/* Bagian Atas: Info */}
                <div className="p-6 grow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
                      {sub.code}
                    </span>
                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-4 line-clamp-2 text-lg leading-tight grow">
                    {sub.name}
                  </h3>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-500">Progress</span>
                      <span className={isCompleted ? 'text-green-600' : 'text-indigo-600'}>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 pt-1">
                      <span>Master: {sub.mastered}</span>
                      <span>Sisa: <strong className={sub.remaining > 0 ? "text-red-500" : "text-green-500"}>{sub.remaining}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bagian Bawah: Tombol */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  {sub.remaining > 0 ? (
                    <Link 
                      href={`/quiz/start-custom?mode=exam&subjectId=${sub.id}&count=20`} 
                      className="group flex items-center justify-center w-full py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-indigo-600 hover:text-white hover:border-transparent transition-all shadow-sm"
                    >
                      <Play className="w-4 h-4 mr-2 group-hover:fill-white" /> 
                      Latihan (20 Soal)
                    </Link>
                  ) : (
                    <button disabled className="w-full py-2.5 bg-green-100 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center cursor-default">
                      <CheckCircle className="w-4 h-4 mr-2" /> Selesai!
                    </button>
                  )}
                </div>
              </div>
            )
          }) : (
             <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-500">Belum ada data mata kuliah. Silakan upload soal di Admin Panel.</p>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* 3. MENU LATIHAN MANUAL (DROPDOWN) - Lebar 1/3 */}
        <div className="lg:col-span-1">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-2 rounded-lg mr-3">
              <List className="w-5 h-5 text-purple-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Latihan Manual</h2>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
             <QuizSelector initialSubjects={subjects} />
          </div>
        </div>

        {/* 4. RIWAYAT PENGERJAAN - Lebar 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center mb-4">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <History className="w-5 h-5 text-orange-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Riwayat Terakhir</h2>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-50">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Modul</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Nilai</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length > 0 ? history.slice(0, 5).map((session: any) => { // Tampilkan 5 terakhir saja biar rapi
                    let displayTitle = session.quiz_title || (session.module?.source?.subject?.name || 'Unknown')
                    
                    return (
                      <tr key={session.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{displayTitle}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            (session.score || 0) >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {session.score ?? '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                             session.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {session.status === 'completed' ? 'Selesai' : 'Proses'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {session.status === 'completed' ? (
                            <Link href={`/result/${session.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline">Detail</Link>
                          ) : (
                            <Link href={`/quiz/${session.id}`} className="text-sm font-medium text-yellow-600 hover:text-yellow-800 hover:underline">Lanjut</Link>
                          )}
                        </td>
                      </tr>
                    )
                  }) : (
                     <tr><td colSpan={4} className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {history.length > 5 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center">
                <button className="text-xs font-medium text-gray-500 hover:text-indigo-600">Lihat Semua Riwayat &rarr;</button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}