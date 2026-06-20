import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getQuizHistory, getSubjects, getDetailedStats } from '@/app/quiz/actions'
import { CheckCircle, List, History, Award, Target, Zap, BookOpen, Clock, Calendar, MessageSquareText, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import QuizSelector from '@/components/quiz-selector'
import ScoreChart from '@/components/score-chart'
import CountdownTimer from '@/components/countdown-timer'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ExamSubject {
  code: string
  session: string
  time: string
  name: string
  isEssay?: boolean
}

interface ExamGroup {
  key: string
  title: string
  date: string
  color: 'violet' | 'emerald'
  subjects: ExamSubject[]
}

// Konfigurasi Jadwal Ujian
const examGroups: ExamGroup[] = [
  {
    key: 'june21',
    title: 'Ujian Pekan 1: Minggu, 21 Juni 2026',
    date: '2026-06-21T08:00:00',
    color: 'violet',
    subjects: [
      { code: 'EMBS4207', session: 'Sesi 2', time: '09:45 - 11:15', name: 'Perilaku Organisasi' },
      { code: 'MKDI4203', session: 'Sesi 3', time: '11:30 - 13:00', name: 'Kewirausahaan di Era Digital' },
      { code: 'STSI4209', session: 'Sesi 4', time: '13:45 - 15:15', name: 'Pemrograman Berbasis Web' },
      { code: 'STSI4207', session: 'Sesi 5', time: '15:30 - 17:00', name: 'Sistem Informasi Manajemen' }
    ]
  },
  {
    key: 'june27',
    title: 'Ujian Pekan 2: Sabtu, 27 Juni 2026',
    date: '2026-06-27T08:00:00',
    color: 'emerald',
    subjects: [
      { code: 'STSI4206', session: 'Sesi 1', time: '08:00 - 09:30', name: 'Proses Bisnis' },
      { code: 'STSI4204', session: 'Sesi 2', time: '09:45 - 11:15', name: 'Analisis dan Visualisasi Data' },
      { code: 'STSI4102', session: 'Sesi 3', time: '11:30 - 13:00', name: 'Algoritma dan Pemrograman' },
      { code: 'MKWN4110', session: 'Sesi 4', time: '13:45 - 15:15', name: 'Pancasila' },
      { code: 'STSI4208', session: 'Sesi 5', time: '15:30 - 17:00', name: 'Analisis dan Perancangan Sistem (Essay)', isEssay: true }
    ]
  }
]

export default async function DashboardPage() {
  noStore()
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
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-12 pt-6" suppressHydrationWarning>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dashboard Peserta</h1>
          <p className="text-sm text-slate-500 font-medium">Selamat datang kembali! Yuk, matangkan persiapan ujian Anda.</p>
        </div>
      </div>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" suppressHydrationWarning>
        
        {/* KOLOM KIRI (Span 2): Daftar Mata Kuliah per Pekan */}
        <div className="lg:col-span-2 space-y-8">
          {examGroups.map((group) => {
            const borderGlow = group.color === 'violet' ? 'border-indigo-100' : 'border-emerald-100'
            const badgeColor = group.color === 'violet' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' : 'bg-emerald-50 text-emerald-700 border-emerald-150'
            const accentText = group.color === 'violet' ? 'text-indigo-600' : 'text-emerald-600'
            const bgGroup = group.color === 'violet' ? 'bg-indigo-50/10' : 'bg-emerald-50/10'

            return (
              <div key={group.key} className={`border ${borderGlow} ${bgGroup} rounded-3xl p-6 space-y-6 shadow-sm`} suppressHydrationWarning>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200/60 pb-4">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Calendar className={`w-5 h-5 ${accentText}`} />
                    {group.title}
                  </h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border self-start ${badgeColor}`}>
                    {group.subjects.length} Mata Kuliah
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.subjects.map((sub) => {
                    // Cari data stat dari DB dengan normalisasi kode & nama
                    const dbStat = subjectStats.find(
                      (dbSub: any) => {
                        const cleanDbCode = dbSub.code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
                        const cleanSubCode = sub.code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
                        
                        // Normalisasi typo angka 1 dan huruf I
                        const normDbCode = cleanDbCode.replace(/1/g, 'I')
                        const normSubCode = cleanSubCode.replace(/1/g, 'I')

                        const cleanDbName = dbSub.name.replace(/[^A-Z]/gi, '').toLowerCase()
                        const cleanSubName = sub.name.replace(/[^A-Z]/gi, '').toLowerCase()
                        
                        return normDbCode === normSubCode || cleanDbName === cleanSubName
                      }
                    )
                    
                    const hasDB = !!dbStat
                    const totalQuestions = dbStat?.totalQuestions || 0
                    const masteredQuestions = dbStat?.masteredQuestions || 0
                    const remaining = dbStat?.remaining ?? 0
                    const progress = dbStat?.progress || 0
                    const avgScore = dbStat?.avgScore || 0
                    const quizCount = dbStat?.quizCount || 0
                    const isCompleted = remaining === 0 && totalQuestions > 0

                    let scoreBadgeBg = 'bg-slate-100 text-slate-500'
                    if (quizCount > 0) {
                      if (avgScore >= 80) scoreBadgeBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      else if (avgScore >= 60) scoreBadgeBg = 'bg-amber-50 text-amber-600 border border-amber-100'
                      else scoreBadgeBg = 'bg-red-50 text-red-600 border border-red-100'
                    }

                    const cardBorder = group.color === 'violet' ? 'hover:border-indigo-300' : 'hover:border-emerald-300'
                    const progressBg = group.color === 'violet' ? 'bg-indigo-600' : 'bg-emerald-600'

                    return (
                      <div 
                        key={sub.code} 
                        className={`glass-card rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 flex flex-col group ${cardBorder} relative overflow-hidden shadow-sm`}
                        suppressHydrationWarning
                      >
                        <div className="p-5 flex-1 flex flex-col">
                          {/* Badge Sesi & Kode */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded border border-slate-250 bg-slate-50 text-slate-500 tracking-wider">
                              {sub.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {sub.session} ({sub.time})
                            </span>
                          </div>

                          {/* Nama Matkul */}
                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-650 transition-colors line-clamp-2 min-h-[2.5rem] leading-relaxed mb-4">
                            {sub.name}
                          </h4>

                          {/* Kondisi Jika Mata Kuliah Ada di Database */}
                          {hasDB ? (
                            <>
                              {/* Statistik Nilai */}
                              <div className="grid grid-cols-2 gap-2.5 mb-4">
                                <div className={`text-center p-2.5 rounded-xl ${scoreBadgeBg} flex flex-col justify-center`}>
                                  <span className="block text-lg font-black">{quizCount > 0 ? avgScore : '-'}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Nilai Avg</span>
                                </div>
                                <div className="text-center p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col justify-center">
                                  <span className="block text-lg font-black text-slate-800">{quizCount}</span>
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Kuis</span>
                                </div>
                              </div>

                              {/* Progress */}
                              <div className="mt-auto space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black">
                                  <span className={accentText}>{progress}% Dikuasai</span>
                                  {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : progressBg}`} 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-1 border-t border-slate-100">
                                  <span>Master: {masteredQuestions}</span>
                                  <span>Sisa: {remaining}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex-1 flex flex-col justify-center items-center p-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center mb-4 min-h-[110px]">
                              <HelpCircle className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Belum Ada Soal</span>
                              <span className="text-[9px] text-slate-405 mt-0.5">Import soal di menu Kelola Ujian</span>
                            </div>
                          )}
                        </div>

                        {/* Tombol Latihan */}
                        {hasDB && (
                          <div className="p-3 bg-slate-50/50 border-t border-slate-150">
                            {sub.isEssay ? (
                              <Link 
                                href={`/quiz/essay?subjectId=${dbStat.id}`}
                                className="flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/10"
                              >
                                <MessageSquareText className="w-3.5 h-3.5 mr-1.5" />
                                Latihan Essay AI
                              </Link>
                            ) : (
                              <Link 
                                href={`/quiz/start-custom?mode=study&subjectId=${dbStat.id}&count=10`} 
                                className="flex items-center justify-center w-full py-2.5 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                Mulai Belajar
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* KOLOM KANAN (Span 1): Sidebar Informasi & Aksi */}
        <div className="space-y-8" suppressHydrationWarning>
          
          {/* A. TARGET & KEMAJUAN GLOBAL */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200/80 bg-white shadow-sm relative overflow-hidden" suppressHydrationWarning>
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 rounded-full blur-3xl opacity-10 bg-indigo-400"></div>

            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 tracking-tight">Progres Belajar Anda</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mastery Target</p>
                </div>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Anda telah menguasai <strong className="text-indigo-650">{global?.mastered || 0}</strong> dari total <strong className="text-slate-800">{global?.totalQuestions || 0}</strong> soal.
                <span className="block text-[10px] text-slate-400 mt-1 font-bold">Jawab benar 1x pada kuis agar dianggap "Master".</span>
              </p>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-indigo-600">{global?.progress || 0}% Selesai</span>
                  <span className="text-slate-400">{global?.remaining || 0} soal sisa</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-indigo-600 to-violet-500 shadow-md relative overflow-hidden" 
                    style={{ width: `${global?.progress || 0}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[bar-stripes_1s_linear_infinite]"></div>
                  </div>
                </div>
              </div>

              {/* Stats Card Mini */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40 text-center">
                  <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-lg font-black text-slate-800">{realTotalQuiz}</div>
                  <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Total Kuis</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40 text-center">
                  <Award className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <div className="text-lg font-black text-slate-800">{realAvgScore}</div>
                  <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Rata-Rata</div>
                </div>
              </div>
            </div>
          </div>

          {/* B. TIMER COUNTDOWN UJIAN */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" /> Waktu Mundur Ujian
            </h3>
            <div className="space-y-4">
              <CountdownTimer targetDate="2026-06-21T09:45:00" title="Ujian Pekan 1 (21 Juni)" color="violet" />
              <CountdownTimer targetDate="2026-06-27T08:00:00" title="Ujian Pekan 2 (27 Juni)" color="emerald" />
            </div>
          </div>

          {/* C. MULAI LATIHAN BEBAS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650">
                <List className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mulai Latihan Bebas</h3>
            </div>
            <QuizSelector initialSubjects={subjects} />
          </div>

          {/* D. RIWAYAT AKTIVITAS TERAKHIR */}
          <div className="space-y-4" suppressHydrationWarning>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aktivitas Terakhir</h3>
            </div>
            
            <div className="glass-card rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matkul / Sesi</th>
                      <th className="px-2 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skor</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.length > 0 ? (
                      history.slice(0, 3).map((session: any) => (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors" suppressHydrationWarning>
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                              {session.quiz_title || session.module?.source?.subject?.name || 'Kuis Custom'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                              {new Date(session.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black border ${
                              (session.score || 0) >= 70 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-red-50 text-red-500 border-red-100'
                            }`}>
                              {session.score ?? '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link 
                              href={`/result/${session.id}`} 
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 px-2 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100/30 transition-all"
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-xs">
                          Belum ada riwayat pengerjaan kuis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* GRAFIK TREN BELAJAR (Di Bawah Full Width) */}
      {history.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white shadow-sm" suppressHydrationWarning>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Grafik Perkembangan Skor</h3>
          </div>
          <div className="w-full overflow-hidden">
            <ScoreChart data={history} />
          </div>
        </div>
      )}
      
    </div>
  )
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}