import { createClient } from '@/utils/supabase/server'
import { getProfileStats } from './actions'
import { redirect } from 'next/navigation'
import { Mail, Award, Star, TrendingUp, User } from 'lucide-react'
import ProfileForm from './profile-form' // Import Komponen Client

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getProfileStats()
  if (!data) return <div>Loading...</div>

  const { profile, stats } = data

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER: KARTU IDENTITAS */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
           {/* Hiasan Background */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8" />
           
           {/* Avatar Besar */}
           <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg shrink-0 border-4 border-indigo-100">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
           </div>

           <div className="text-center md:text-left z-10">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {profile?.full_name || 'Pengguna Baru'}
              </h1>
              <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mb-4">
                <Mail className="w-4 h-4" /> {user.email}
              </p>
              
              {/* Badge Level */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold border border-yellow-200 shadow-sm">
                 <Award className="w-4 h-4 mr-2" /> Level: {stats.level}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* KOLOM KIRI: FORM EDIT PROFIL (CLIENT COMPONENT) */}
           <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-gray-800 mb-6 flex items-center border-b pb-4">
                <User className="w-5 h-5 mr-2 text-indigo-600" /> 
                Edit Informasi
              </h2>

              {/* Panggil ProfileForm di sini */}
              <ProfileForm user={user} profile={profile} />
           </div>

           {/* KOLOM KANAN: STATISTIK MINI */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
              <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Statistik Kamu</h3>
              
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-2xl font-black text-gray-800">{stats.totalQuiz}</div>
                    <div className="text-xs text-gray-500 font-medium">Kuis Diselesaikan</div>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Star className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-2xl font-black text-gray-800">{stats.totalScore}</div>
                    <div className="text-xs text-gray-500 font-medium">Total Poin (XP)</div>
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <div className="text-xs text-center text-gray-400">
                    Akurasi Rata-rata: <span className="font-bold text-gray-700">{stats.avgScore}%</span>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  )
}