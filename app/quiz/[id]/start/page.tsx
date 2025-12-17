import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Clock, Play, CheckCircle } from 'lucide-react'

// Perhatikan: params sekarang menggunakan 'id'
export default async function QuizStartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ambil Detail Modul
  const { data: moduleData } = await supabase
    .from('modules')
    .select(`
      id, name, description,
      source:sources (
        name,
        subject:subjects (name, code)
      )
    `)
    .eq('id', id)
    .single()

  if (!moduleData) {
    return <div className="p-10 text-center">Modul tidak ditemukan</div>
  }

  // Hitung Jumlah Soal
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', id)

  // --- PERBAIKAN LOGIC DATA (Handle Array/Object) ---
  const rawSource = moduleData.source
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource

  const rawSubject = source?.subject
  const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Gambar/Warna */}
        {/* Fix: Menggunakan bg-linear-to-r sesuai saran Tailwind terbaru */}
        <div className="h-32 bg-linear-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
          <BookOpen className="w-16 h-16 text-white/20" />
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
             <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
               {subject?.code} - {subject?.name}
             </span>
             <h1 className="text-2xl font-bold text-gray-900 mb-2">{moduleData.name}</h1>
             <p className="text-gray-500 text-sm">{moduleData.description || 'Latihan soal untuk modul ini.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                <div className="text-gray-400 mb-1"><Clock className="w-5 h-5 mx-auto" /></div>
                <div className="font-bold text-gray-800 text-sm">~{Math.ceil((totalQuestions || 0) * 1.5)} Menit</div>
             </div>
             <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                <div className="text-gray-400 mb-1"><CheckCircle className="w-5 h-5 mx-auto" /></div>
                <div className="font-bold text-gray-800 text-sm">{totalQuestions} Soal</div>
             </div>
          </div>

          <div className="space-y-3">
             {/* Tombol Mulai */}
             <Link 
               href={`/quiz/start-custom?mode=exam&count=10&modules=${id}`}
               className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center transition-all shadow-md hover:shadow-lg flex items-center justify-center"
             >
               <Play className="w-4 h-4 mr-2 fill-current" /> Mulai Ujian (10 Soal)
             </Link>

             <Link 
               href="/dashboard"
               className="block w-full py-3 px-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-center hover:bg-gray-50 transition-all"
             >
               Batal
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}