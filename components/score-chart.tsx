'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Calendar, BarChart3, TrendingUp } from 'lucide-react'

export default function ScoreChart({ data }: { data: any[] }) {
  // State Filter
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'all' | 'custom'>('7d')
  
  // State untuk Tanggal Custom (Default: 1 bulan terakhir)
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // --- LOGIKA FILTER DATA ---
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // 1. Urutkan data (Terlama -> Terbaru)
    const sorted = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 2. Terapkan Filter
    if (range === 'all') return sorted

    if (range === 'today') {
      return sorted.filter(item => new Date(item.created_at) >= startOfDay)
    }

    if (range === '7d') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7)
      return sorted.filter(item => new Date(item.created_at) >= cutoff)
    }

    if (range === '30d') {
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30)
      return sorted.filter(item => new Date(item.created_at) >= cutoff)
    }

    if (range === 'custom') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) 

      return sorted.filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= start && itemDate <= end
      })
    }

    return sorted
  }, [data, range, startDate, endDate])

  // --- LOGIKA RATA-RATA DINAMIS (FITUR BARU) ---
  const averageScore = useMemo(() => {
    if (filteredData.length === 0) return 0
    const total = filteredData.reduce((acc, curr) => acc + (curr.score || 0), 0)
    return Math.round(total / filteredData.length)
  }, [filteredData])

  // --- UI Helpers ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // 👇 1. TAMBAHKAN LOGIC FORMAT TANGGAL DI SINI (Convert ke WIB)
      const formattedDate = new Date(label).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short', // 24 Des
        year: 'numeric', // 2025
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // 24 jam
        timeZone: 'Asia/Jakarta' // Paksa Zona Waktu Jakarta
      }) + ' WIB'

      const dataPoint = payload[0].payload
      const title = dataPoint.quiz_title || 
                    dataPoint.module?.source?.subject?.name || 
                    dataPoint.module?.name || 
                    'Latihan'

      return (
        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-xs z-50">
          {/* 👇 2. GANTI {label} MENJADI {formattedDate} */}
          <p className="font-bold text-gray-500 mb-1">{formattedDate}</p>
          
          <div className="flex items-end gap-2">
             <span className="text-2xl font-black text-indigo-600">
               {payload[0].value}
             </span>
             <span className="text-gray-400 font-medium mb-1">Poin</span>
          </div>
          <p className="text-gray-700 font-medium mt-2 max-w-[180px] leading-tight">
            {title}
          </p>
          {dataPoint.score >= 70 ? (
             <span className="inline-block mt-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LULUS</span>
          ) : (
             <span className="inline-block mt-2 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">GAGAL</span>
          )}
        </div>
      )
    }
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (range === 'today') {
       return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' , hour12: false, timeZone: 'Asia/Jakarta'})
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' , timeZone: 'Asia/Jakarta'})
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
        <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm font-medium">Belum ada data grafik.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 1. HEADER (HANYA SATU JUDUL) */}
      <div className="flex flex-col gap-4 mb-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           {/* Judul & Deskripsi Filter digabung disini */}
           <div>
             <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-indigo-600" />
               Tren Nilai
             </h4>
             <p className="text-xs text-gray-400">
               {range === 'today' ? 'Performa Hari Ini' : 
                range === 'custom' ? 'Periode Kustom' : 
                range === 'all' ? 'Sepanjang Waktu' : 
                `${range === '7d' ? '7' : '30'} Hari Terakhir`}
             </p>
           </div>

           {/* Tombol Filter */}
           <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg text-xs font-bold">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: '7d', label: '7 Hari' },
                { id: '30d', label: '30 Hari' },
                { id: 'all', label: 'Semua' },
                { id: 'custom', label: 'Custom' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setRange(btn.id as any)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    range === btn.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
           </div>
        </div>

        {/* Date Picker (Custom Mode) */}
        {range === 'custom' && (
          <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
              />
          </div>
        )}
      </div>

      {/* 2. CHART AREA */}
      <div className="w-full h-[300px] min-w-0">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              
              <XAxis 
                dataKey="created_at" 
                tickFormatter={formatDate} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                dy={10}
                minTickGap={30}
              />
              
              <YAxis 
                domain={[0, 100]} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }} />
              
              {/* GARIS 1: KKM (MERAH - Posisi Kanan) */}
              <ReferenceLine 
                y={70} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5} 
                label={{ 
                  value: 'KKM (70)', 
                  position: 'insideTopRight', 
                  fill: '#ef4444', 
                  fontSize: 10, 
                  opacity: 0.8 
                }} 
              />

              {/* GARIS 2: RATA-RATA (ORANYE - Posisi Kiri - DINAMIS) */}
              <ReferenceLine 
                y={averageScore} 
                stroke="#f59e0b" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  value: `Rata-rata (${averageScore})`, 
                  position: 'insideLeft', // Agar tidak tabrakan dengan KKM
                  fill: '#f59e0b', 
                  fontSize: 10, 
                  fontWeight: 'bold',
                  dy: -10 // Sedikit di atas garis
                }} 
              />

              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            Tidak ada data kuis di periode ini.
          </div>
        )}
      </div>
      
      {/* 3. Footer Info */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-3 uppercase tracking-wider font-semibold">
         <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> 
            Rata-rata Periode: <span className="text-orange-600 font-bold">{averageScore}</span>
         </span>
         <span>
           Terakhir: <span className={`text-sm ${filteredData.length > 0 && filteredData[filteredData.length-1].score >= 70 ? 'text-green-600' : 'text-indigo-600'}`}>
             {filteredData.length > 0 ? filteredData[filteredData.length - 1].score : '-'}
           </span>
         </span>
      </div>
    </div>
  )
}