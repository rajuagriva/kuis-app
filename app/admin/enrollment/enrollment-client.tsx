'use client'

import { useState, useEffect } from 'react'
import { getStudentEnrollments, toggleStudentEnrollment } from '@/app/admin/actions'
import { Search, User, BookOpen, Check, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  students: any[]
  subjects: any[]
}

export default function EnrollmentClient({ students, subjects }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [enrolledSubjects, setEnrolledSubjects] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Filter siswa berdasarkan search
  const filteredStudents = students.filter(s => 
    (s.full_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (s.email?.toLowerCase() || '').includes(search.toLowerCase())
  )

  // Saat siswa dipilih, ambil data enrollment-nya
  useEffect(() => {
    if (selectedStudent) {
      setLoading(true)
      getStudentEnrollments(selectedStudent)
        .then((ids) => {
          setEnrolledSubjects(new Set(ids))
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [selectedStudent])

  // Handle Klik Checkbox
  const handleToggle = async (subjectId: string, currentStatus: boolean) => {
    if (!selectedStudent) return

    // Optimistic Update (Ubah UI duluan biar cepat)
    const newSet = new Set(enrolledSubjects)
    if (currentStatus) newSet.delete(subjectId)
    else newSet.add(subjectId)
    setEnrolledSubjects(newSet)

    // Panggil Server Action
    try {
      await toggleStudentEnrollment(selectedStudent, subjectId, !currentStatus)
    } catch (error) {
      console.error(error)
      alert('Gagal menyimpan perubahan.')
      // Rollback jika gagal (kembalikan ke state awal)
      if (currentStatus) newSet.add(subjectId)
      else newSet.delete(subjectId)
      setEnrolledSubjects(new Set(newSet)) 
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* KOLOM KIRI: DAFTAR SISWA */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Cari siswa..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
           </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
           {filteredStudents.map(student => (
             <button
               key={student.id}
               onClick={() => setSelectedStudent(student.id)}
               className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                 selectedStudent === student.id 
                   ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' 
                   : 'hover:bg-gray-50 border border-transparent'
               }`}
             >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${selectedStudent === student.id ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                 {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
               </div>
               <div className="truncate w-full">
                 <div className={`text-sm font-bold truncate ${selectedStudent === student.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                   {student.full_name || 'Tanpa Nama'}
                 </div>
                 <div className="text-xs text-gray-500 truncate">{student.email}</div>
               </div>
             </button>
           ))}
           {filteredStudents.length === 0 && (
             <div className="text-center py-8 text-gray-400 text-sm">Siswa tidak ditemukan.</div>
           )}
        </div>
      </div>

      {/* KOLOM KANAN: PILIH MATKUL */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 p-6 h-[600px] overflow-y-auto relative">
        
        {!selectedStudent ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <User className="w-16 h-16 mb-4 opacity-20" />
             <p>Pilih siswa di sebelah kiri untuk mengatur akses.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full text-indigo-600">
             <Loader2 className="w-10 h-10 animate-spin mb-2" />
             <p className="text-sm font-medium">Memuat data akses...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 pb-4 border-b border-gray-100">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <BookOpen className="w-5 h-5 text-indigo-600" />
                 Akses Mata Kuliah
               </h2>
               <p className="text-sm text-gray-500">
                 Centang mata kuliah yang diizinkan untuk siswa ini. Perubahan tersimpan otomatis.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {subjects.map(sub => {
                 const isChecked = enrolledSubjects.has(sub.id)
                 return (
                   <div 
                     key={sub.id}
                     onClick={() => handleToggle(sub.id, isChecked)}
                     className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3 group ${
                       isChecked 
                         ? 'border-indigo-600 bg-indigo-50' 
                         : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                     }`}
                   >
                     <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors shrink-0 mt-0.5 ${
                       isChecked 
                         ? 'bg-indigo-600 border-indigo-600' 
                         : 'bg-white border-gray-300 group-hover:border-indigo-400'
                     }`}>
                        {isChecked && <Check className="w-4 h-4 text-white" />}
                     </div>
                     
                     <div>
                       <div className={`font-bold text-sm ${isChecked ? 'text-indigo-800' : 'text-gray-700'}`}>
                         {sub.name}
                       </div>
                       <div className="text-xs text-gray-500 font-mono mt-0.5">
                         Kode: {sub.code}
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
             
             {subjects.length === 0 && (
               <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg flex items-center text-sm">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 Belum ada mata kuliah di database. Tambahkan dulu di menu "Atur Matkul".
               </div>
             )}
          </div>
        )}
      </div>

    </div>
  )
}