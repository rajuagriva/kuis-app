import { createClient } from '@/utils/supabase/server'
import { getLeaderboard } from '@/app/quiz/actions'
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const leaderboard = await getLeaderboard()
  
  // Pisahkan Top 3 dan Sisanya
  const top3 = leaderboard.slice(0, 3)
  const others = leaderboard.slice(3)

  // Helper Warna Juara
  const getRankStyle = (index: number) => {
    if (index === 0) return "bg-yellow-100 border-yellow-300 text-yellow-800" // Emas
    if (index === 1) return "bg-gray-100 border-gray-300 text-gray-800"       // Perak
    if (index === 2) return "bg-orange-100 border-orange-300 text-orange-800" // Perunggu
    return "bg-white border-gray-100 text-gray-700"
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header Banner */}
      <div className="bg-indigo-600 pt-12 pb-24 px-4 text-center text-white">
         <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
           <Trophy className="w-8 h-8 text-yellow-300" />
           Papan Peringkat
         </h1>
         <p className="text-indigo-100 text-sm max-w-md mx-auto">
           Siswa terbaik berdasarkan rata-rata nilai ujian tertinggi minggu ini.
           Terus belajar untuk merebut posisi puncak! 🚀
         </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16">
        
        {/* PODIUM TOP 3 (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
           {/* Juara 2 (Kiri) */}
           {top3[1] && (
             <div className="order-2 md:order-1 bg-white rounded-2xl shadow-lg border-b-4 border-gray-300 p-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-2 bg-gray-300" />
                <Medal className="w-10 h-10 text-gray-400 mb-3" />
                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-xl font-bold text-gray-500 mb-3">
                  2
                </div>
                <h3 className="font-bold text-gray-800 truncate w-full">{top3[1].name}</h3>
                <p className="text-gray-500 text-xs mb-3">{top3[1].totalQuiz} Kuis</p>
                <div className="text-2xl font-black text-gray-700">{top3[1].avgScore}</div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Rata-rata</span>
             </div>
           )}

           {/* Juara 1 (Tengah - Paling Besar) */}
           {top3[0] && (
             <div className="order-1 md:order-2 bg-white rounded-t-3xl rounded-b-2xl shadow-xl border-b-4 border-yellow-400 p-8 flex flex-col items-center text-center relative z-10 transform md:-translate-y-4">
                <div className="absolute top-0 w-full h-3 bg-yellow-400" />
                <Crown className="w-12 h-12 text-yellow-500 mb-3 animate-bounce" />
                <div className="w-20 h-20 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center text-3xl font-bold text-yellow-600 mb-3 shadow-inner">
                  1
                </div>
                <h3 className="font-bold text-lg text-gray-900 truncate w-full">{top3[0].name}</h3>
                <p className="text-indigo-600 text-xs font-bold mb-4 bg-indigo-50 px-2 py-1 rounded-full">{top3[0].totalQuiz} Kuis Selesai</p>
                <div className="text-4xl font-black text-gray-800">{top3[0].avgScore}</div>
                <span className="text-xs uppercase font-bold text-gray-400">Nilai Sempurna</span>
             </div>
           )}

           {/* Juara 3 (Kanan) */}
           {top3[2] && (
             <div className="order-3 md:order-3 bg-white rounded-2xl shadow-lg border-b-4 border-orange-300 p-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-2 bg-orange-300" />
                <Award className="w-10 h-10 text-orange-400 mb-3" />
                <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-xl font-bold text-orange-500 mb-3">
                  3
                </div>
                <h3 className="font-bold text-gray-800 truncate w-full">{top3[2].name}</h3>
                <p className="text-gray-500 text-xs mb-3">{top3[2].totalQuiz} Kuis</p>
                <div className="text-2xl font-black text-gray-700">{top3[2].avgScore}</div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Rata-rata</span>
             </div>
           )}
        </div>

        {/* LIST SISANYA (4-10) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-500 text-xs uppercase tracking-wider flex justify-between">
            <span>Peringkat</span>
            <span>Nilai Rata-rata</span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {others.map((player, idx) => (
              <div key={player.userId} className={`flex items-center justify-between p-4 hover:bg-indigo-50 transition-colors ${user.id === player.userId ? 'bg-indigo-50' : ''}`}>
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 bg-gray-100 rounded-lg text-sm">
                      {idx + 4}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${user.id === player.userId ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {player.name} {user.id === player.userId && '(Anda)'}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {player.totalQuiz} Kuis
                      </div>
                    </div>
                 </div>
                 
                 <div className="font-bold text-gray-800 text-lg">
                   {player.avgScore}
                 </div>
              </div>
            ))}

            {others.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                Belum ada data peringkat lainnya.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}