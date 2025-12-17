'use client'

// UPDATE 1: Import dari 'react' bukan 'react-dom'
import { useActionState } from 'react' 
import { updateProfile, ProfileState } from './actions'
import { Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

// Sesuaikan initialState dengan tipe ProfileState
const initialState: ProfileState = {
  message: '',
  error: '',
  success: ''
}

export default function ProfileForm({ user, profile }: { user: any, profile: any }) {
  // UPDATE 2: Ganti useFormState menjadi useActionState
  // useActionState mengembalikan 3 hal: [state, action, isPending]
  const [state, formAction, isPending] = useActionState(updateProfile, initialState)

  return (
    <form action={formAction} className="space-y-4">
      {/* Tampilkan Pesan Error */}
      {state?.error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 mr-2" /> {state.error}
        </div>
      )}

      {/* Tampilkan Pesan Sukses */}
      {state?.success && (
        <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center animate-in fade-in slide-in-from-top-1">
          <CheckCircle className="w-4 h-4 mr-2" /> {state.success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Tidak bisa diubah)</label>
        <input 
          type="text" 
          value={user.email || ''} 
          disabled 
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" 
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
        <input 
          name="fullName"
          type="text" 
          defaultValue={profile?.full_name || ''} 
          placeholder="Masukkan nama lengkap Anda"
          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
        />
        <p className="text-xs text-gray-400 mt-1">Nama ini akan muncul di Leaderboard.</p>
      </div>

      <div className="pt-4">
        {/* UPDATE 3: Tombol dengan Loading State */}
        <button 
          type="submit" 
          disabled={isPending}
          className="flex items-center justify-center w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-md"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  )
}