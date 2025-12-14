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
import { Calendar, ChevronDown, BarChart3 } from 'lucide-react' // <-- BarChart3 sudah ditambahkan

export default function ScoreChart({ data }: { data: any[] }) {
  // State Filter
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'all' | 'custom'>('7d')
  
  // State untuk Tanggal Custom (Default: 1 bulan terakhir)
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Logika Pemfilteran Data yang Kuat
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
      // Konversi string input ke Date object
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

  // --- UI Helpers ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs z-50">
          <p className="font-bold text-gray-900 mb-1">{label}</p>
          <p className="text-indigo-600 font-bold text-base">
            Nilai: {payload[0].value}
          </p>
          <p className="text-gray-500 mt-1 max-w-[150px] truncate">
            {payload[0].payload.quiz_title || payload[0].payload.module?.source?.subject?.name || 'Latihan'}
          </p>
        </div>
      )
    }
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Tampilkan jam jika filter 'Hari Ini', jika tidak tampilkan Tanggal/Bulan
    if (range === 'today') {
       return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // --- Render ---
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
        <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
        <p>Belum ada data grafik.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 mb-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h4 className="text-sm font-bold text-gray-700">
             Tren Nilai ({range === 'today' ? 'Hari Ini' : range === 'custom' ? 'Periode Kustom' : range === 'all' ? 'Sepanjang Waktu' : `${range === '7d' ? '7' : '30'} Hari Terakhir`})
           </h4>

           {/* Tombol Filter Group */}
           <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg text-xs font-medium">
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
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
           </div>
        </div>

        {/* 2. Custom Date Picker (Hanya muncul jika mode Custom) */}
        {range === 'custom' && (
          <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
             <Calendar className="w-4 h-4 text-indigo-600" />
             <input 
               type="date" 
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               className="bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
             <span className="text-gray-400">-</span>
             <input 
               type="date" 
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               className="bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          </div>
        )}
      </div>

      {/* 3. Area Chart */}
      <div className="w-full h-[300px]">
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
            
            {/* Garis KKM */}
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'KKM (70)', position: 'insideTopLeft', fill: '#ef4444', fontSize: 9, opacity: 0.7 }} />

            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#6366f1" 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill="url(#colorScore)" 
              activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#4f46e5' }}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* 4. Footer Info */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-3">
         <span>
           {filteredData.length > 0 
             ? `Menampilkan ${filteredData.length} data kuis.` 
             : 'Tidak ada data pada periode ini.'}
         </span>
         <span>
           Nilai Terakhir: <strong className="text-indigo-600">{filteredData.length > 0 ? filteredData[filteredData.length - 1].score : '-'}</strong>
         </span>
      </div>
    </div>
  )
}