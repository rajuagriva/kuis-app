import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getQuizHistory, getSubjects, getDetailedStats } from '@/app/quiz/actions'
import { Play, CheckCircle, BarChart3, List, History, Award, TrendingUp, Target, Zap, BookOpen } from 'lucide-react'
import Link from 'next/link'
import QuizSelector from '@/components/quiz-selector'
import ScoreChart from '@/components/score-chart'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [history, subjects, detailedStats] = await Promise.all([
    getQuizHistory(),
    getSubjects(),
    getDetailedStats()
  ])

  const { global, subjects: subjectStats } = detailedStats

  // Logic Hitung Stats agar Sinkron
  const realTotalQuiz = subjectStats.reduce((acc: number, curr: any) => acc + (curr.quizCount || 0), 0)
  
  let totalScoreAccumulated = 0
  let totalQuizForAvg = 0
  
  subjectStats.forEach((sub: any) => {
    if (sub.quizCount > 0) {
      totalScoreAccumulated += (sub.avgScore * sub.quizCount)
      totalQuizForAvg += sub.quizCount
    }
  })
  
  const realAvgScore = totalQuizForAvg > 0 ? Math.round(totalScoreAccumulated / totalQuizForAvg) : 0

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12" suppressHydrationWarning>
      
      {/* 1. HEADER: GLOBAL PROGRESS */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden" suppressHydrationWarning>
        
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: 'var(--primary)' }}></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ backgroundColor: 'var(--primary)' }}></div>

        <div className="relative z-10 flex-1 w-full" suppressHydrationWarning>
          <div className="flex items-center mb-2">
            <div className="p-2 rounded-lg mr-3 bg-gray-50" style={{ color: 'var(--primary)' }}>
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Global Progress</h2>
          </div>
          <p className="text-gray-500 mb-6 max-w-lg leading-relaxed">
            Anda telah menguasai <strong style={{ color: 'var(--primary)' }}>{global?.mastered}</strong> dari total <strong className="text-gray-900">{global?.totalQuestions}</strong> soal.
            <br/><span className="text-xs text-gray-400">Jawab benar 3x agar soal dianggap "Master".</span>
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-gray-700">
              <span style={{ color: 'var(--primary)' }}>{global?.progress}% Selesai</span>
              <span className="text-gray-400 font-normal">{global?.remaining} soal lagi</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden border border-gray-100">
              <div 
                className="h-full rounded-full transition-all duration-1000 shadow-sm relative overflow-hidden" 
                style={{ width: `${global?.progress}%`, backgroundColor: 'var(--primary)' }}
              >
                 <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 bg-gradient-to-b from-white to-transparent"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card Mini */}
        <div className="relative z-10 flex gap-4 w-full md:w-auto" suppressHydrationWarning>
           <div className="flex-1 md:w-40 bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
             <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
             <div className="text-2xl font-extrabold text-gray-900">{realTotalQuiz}</div>
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Sesi</div>
           </div>
           <div className="flex-1 md:w-40 bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
             <Award className="w-6 h-6 text-green-500 mx-auto mb-2" />
             <div className="text-2xl font-extrabold text-gray-900">{realAvgScore}</div>
             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rata-Rata</div>
           </div>
        </div>
      </div>

      {/* 2. GRAFIK TREN */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200" suppressHydrationWarning>
         <div className="flex items-center mb-6">
            <BarChart3 className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="font-bold text-gray-700">Tren Nilai & Konsistensi</h3>
         </div>
         <ScoreChart data={history} />
      </div>

      <hr className="border-gray-200 border-dashed" />

      {/* 3. KARTU PERFORMA MATKUL */}
      <div suppressHydrationWarning>
        <div className="flex items-center mb-6">
          <div className="bg-gray-50 p-2 rounded-lg mr-3">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detail Per Mata Kuliah</h2>
            <p className="text-sm text-gray-500">Pantau progres "Master" dan nilai rata-rata Anda.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {subjectStats.length > 0 ? subjectStats.map((sub: any) => {
            const isCompleted = sub.remaining === 0 && sub.totalQuestions > 0
            
            let scoreColor = "text-gray-300"
            let scoreBg = "bg-gray-50"
            if (sub.quizCount > 0) {
                if (sub.avgScore >= 80) { scoreColor = "text-green-600"; scoreBg = "bg-green-50"; }
                else if (sub.avgScore >= 60) { scoreColor = "text-yellow-600"; scoreBg = "bg-yellow-50"; }
                else { scoreColor = "text-red-600"; scoreBg = "bg-red-50"; }
            }

            return (
              <div key={sub.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col hover:border-[color:var(--primary)]" style={{ borderColor: 'transparent' }} suppressHydrationWarning>
                <div className="p-5 flex-grow flex flex-col">
                  {/* Header Nama Matkul */}
                  <div className="flex justify-between items-start mb-3">
                      <span 
                        className="text-[10px] font-bold px-2 py-1 rounded border bg-gray-50" 
                        style={{ color: 'var(--primary)', borderColor: 'rgba(0,0,0,0.05)' }}
                      >
                        {sub.code}
                      </span>
                      {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-4 line-clamp-2 min-h-[3rem] text-sm leading-relaxed group-hover:text-[color:var(--primary)] transition-colors">
                      {sub.name}
                  </h3>

                  {/* Statistik Nilai */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`text-center p-2 rounded-lg ${scoreBg}`}>
                        <span className={`block text-xl font-bold ${scoreColor}`}>{sub.quizCount > 0 ? sub.avgScore : '-'}</span>
                        <span className="text-[10px] text-gray-500 font-medium">Nilai Avg</span>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <span className="block text-xl font-bold text-gray-700">{sub.quizCount}</span>
                        <span className="text-[10px] text-gray-500 font-medium">Total Kuis</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar & Detail Angka (UPDATE DISINI) */}
                  <div className="mt-auto space-y-2">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : ''}`} 
                        style={{ width: `${sub.progress}%`, backgroundColor: isCompleted ? undefined : 'var(--primary)' }}
                      ></div>
                    </div>
                    
                    {/* Detail Angka Master vs Belum */}
                    <div className="flex justify-between items-center text-[11px] font-medium pt-1 border-t border-gray-50">
                      <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                        Master: {sub.masteredQuestions}
                      </span>
                      <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                        Belum: {sub.remaining}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Latihan (UPDATE: MODE STUDY) */}
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                   <Link 
                      // Ubah 'mode=exam' menjadi 'mode=study'
                      href={`/quiz/start-custom?mode=study&subjectId=${sub.id}&count=10`} 
                      className="flex items-center justify-center w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                      style={{ '--hover-bg': 'var(--primary)' } as React.CSSProperties}
                    >
                      <span className="flex items-center group-hover:text-[color:var(--primary)]">
                         {/* Ganti icon Play jadi BookOpen biar kesan belajar */}
                         <BookOpen className="w-3.5 h-3.5 mr-2" /> 
                         Mulai Belajar
                      </span>
                    </Link>
                </div>
              </div>
            )
          }) : (
             <div className="col-span-full p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400">Belum ada data mata kuliah.</p>
             </div>
          )}
        </div>
      </div>
      
      {/* 4. LAYOUT BAWAH (Manual & Riwayat) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4" suppressHydrationWarning>
        <div className="lg:col-span-1">
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 p-2 rounded-lg mr-3"><List className="w-5 h-5 text-gray-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Menu Manual</h2>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-200" suppressHydrationWarning>
             <QuizSelector initialSubjects={subjects} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center mb-4">
            <div className="bg-gray-100 p-2 rounded-lg mr-3"><History className="w-5 h-5 text-gray-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Riwayat Terakhir</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Aktivitas</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">Skor</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.slice(0, 5).map((session: any) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors" suppressHydrationWarning>
                      <td className="px-6 py-4">
                         <div className="text-sm font-bold text-gray-900">
                            {session.quiz_title || session.module?.source?.subject?.name || 'Kuis Custom'}
                         </div>
                         <div className="text-xs text-gray-400 mt-0.5">
                           {new Date(session.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'})}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            (session.score || 0) >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{session.score ?? '0'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <Link href={`/result/${session.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--primary)' }}>Lihat</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}