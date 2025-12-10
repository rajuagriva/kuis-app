'use client'

import { useState, useEffect } from 'react'
import { updateTheme } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ThemeBuilderPage() {
  const router = useRouter()
  const [color, setColor] = useState('#4f46e5') // Default Indigo
  const [radius, setRadius] = useState(8)
  const [saving, setSaving] = useState(false)

  // Load tema saat ini saat halaman dibuka
  useEffect(() => {
    const fetchCurrentTheme = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if(user) {
            const { data } = await supabase.from('profiles').select('theme_config').eq('id', user.id).single()
            if(data?.theme_config) {
                setColor(data.theme_config.color || '#4f46e5')
                setRadius(data.theme_config.radius || 8)
            }
        }
    }
    fetchCurrentTheme()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateTheme({ color, radius })
      alert('Tema berhasil disimpan!')
      router.refresh()
    } catch (err) {
      alert('Gagal menyimpan tema')
    } finally {
      setSaving(false)
    }
  }

  // Objek Style untuk Preview Realtime
  const previewStyle = {
    '--color-primary': color,
    '--radius': `${radius}px`
  } as React.CSSProperties

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Theme Builder</h1>
            <button 
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
            >
                &larr; Kembali ke Dashboard
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* KOLOM KIRI: KONTROL */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="font-semibold mb-6 text-gray-800">Pengaturan Tampilan</h2>
            
            {/* Input Warna */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Warna Utama (Primary)</label>
              <div className="flex items-center space-x-3">
                <input 
                  type="color" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 p-1 rounded border cursor-pointer"
                />
                <span className="text-sm font-mono text-gray-500">{color}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Warna ini akan dipakai untuk tombol, header, dan aksen aktif.</p>
            </div>

            {/* Input Radius */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Kelengkungan Sudut (Radius): {radius}px</label>
              <input 
                type="range" 
                min="0" 
                max="24" 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Kotak (0px)</span>
                <span>Bulat (24px)</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

          {/* KOLOM KANAN: PREVIEW LIVE */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Live Preview</h3>
            
            {/* Area Preview ini menggunakan style dinamis */}
            <div style={previewStyle} className="space-y-4">
              
              {/* Preview 1: Kartu Soal */}
              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg"> {/* rounded-lg ini akan ikut config tailwind */}
                <span className="inline-block px-2 py-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded mb-3">
                  Preview Mode
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Contoh Tampilan Soal</h3>
                <p className="text-gray-600 mb-4">
                  Coba geser slider radius dan ganti warna di sebelah kiri. Tampilan kartu ini akan berubah secara langsung.
                </p>
                <div className="space-y-2">
                  {['Pilihan Jawaban A', 'Pilihan Jawaban B (Terpilih)'].map((opt, idx) => (
                    <div key={idx} className={`p-3 border rounded-lg flex items-center ${idx === 1 ? 'border-[var(--color-primary)] bg-gray-50' : 'border-gray-200'}`}>
                      <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${idx === 1 ? 'border-[var(--color-primary)]' : 'border-gray-300'}`}>
                        {idx === 1 && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>}
                      </div>
                      <span className={idx === 1 ? 'font-medium text-[var(--color-primary)]' : 'text-gray-600'}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview 2: Tombol */}
              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg flex gap-3">
                 <button className="bg-[var(--color-primary)] text-white px-4 py-2 rounded font-medium shadow-sm opacity-90 hover:opacity-100">
                    Tombol Utama
                 </button>
                 <button className="border border-[var(--color-primary)] text-[var(--color-primary)] px-4 py-2 rounded font-medium">
                    Tombol Outline
                 </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}