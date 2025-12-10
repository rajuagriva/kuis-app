'use client'

import { useState, useEffect, useActionState } from 'react' // <--- GANTI useFormState JADI useActionState
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { uploadQuizData } from '@/app/admin/actions'
import { Upload, FileJson, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminUploadPage() {
  // GANTI useFormState MENJADI useActionState
  const [state, formAction, isPending] = useActionState(uploadQuizData, null) 
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(true)
  const router = useRouter()

  // 1. Cek Apakah User adalah Admin (Client Side Check)
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard') // Tendang peserta bandel ke dashboard
      } else {
        setIsAdmin(true)
      }
      setLoadingCheck(false)
    }

    checkAdmin()
  }, [router])

  // Tampilkan Loading saat cek admin
  if (loadingCheck) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-indigo-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Memverifikasi akses admin...</span>
        </div>
      </div>
    )
  }

  // Jika bukan admin, jangan tampilkan apa-apa (karena akan diredirect)
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Tombol Kembali */}
        <div className="mb-6">
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali ke Dashboard
          </Link>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          
          {/* Header */}
          <div className="bg-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center space-x-3">
              <FileJson className="h-8 w-8 text-indigo-200" />
              <h1 className="text-2xl font-bold">Import Soal Massal</h1>
            </div>
            <p className="mt-2 text-indigo-100 text-sm">
              Upload file JSON untuk menambahkan Mata Kuliah, Modul, dan Soal sekaligus.
            </p>
          </div>

          <div className="p-8">
            {/* Form Upload */}
            <form action={formAction} className="space-y-6">
              
              {/* Area Drop File */}
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                <input
                  type="file"
                  name="file"
                  accept=".json"
                  required
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                    <Upload className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium text-indigo-600">Klik untuk upload</span> atau seret file JSON ke sini
                  </div>
                  <p className="text-xs text-gray-400">Hanya file .json yang didukung</p>
                </div>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Memproses Data...
                  </>
                ) : (
                  'Upload & Proses Data'
                )}
              </button>
            </form>

            {/* Alert Sukses / Gagal */}
            {state?.message && (
              <div className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${state.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {state.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${state.success ? 'text-green-800' : 'text-red-800'}`}>
                    {state.success ? 'Berhasil!' : 'Gagal'}
                  </h3>
                  <p className={`mt-1 text-sm ${state.success ? 'text-green-700' : 'text-red-700'}`}>
                    {state.message}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Info Format JSON */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Panduan Format JSON</h3>
          <p className="text-sm text-gray-500 mb-4">Pastikan struktur file JSON Anda seperti contoh di bawah ini:</p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`[
  {
    "code": "MK001",
    "name": "Nama Mata Kuliah",
    "sources": [
      {
        "name": "UAS 2024",
        "type": "exam",
        "modules": [
          {
            "name": "Paket A",
            "questions": [
              {
                "content": "Apa ibukota Indonesia?",
                "explanation": "Ibukota saat ini adalah Jakarta.",
                "options": [
                  { "text": "Jakarta", "is_correct": true },
                  { "text": "Bandung", "is_correct": false },
                  { "text": "Surabaya", "is_correct": false },
                  { "text": "Medan", "is_correct": false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]`}
          </pre>
        </div>

      </div>
    </div>
  )
}