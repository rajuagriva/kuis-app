'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

export default function ScoreChart({ data }: { data: any[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 min-h-[200px]">
        <p>Belum cukup data untuk grafik.</p>
        <p className="text-xs mt-1">Kerjakan minimal 2 kuis.</p>
      </div>
    )
  }

  // Format data: Tampilkan Jam jika tanggalnya sama
  const chartData = data.map((item) => {
    const date = new Date(item.created_at)
    return {
      // Tampilkan Jam:Menit agar terlihat bedanya
      name: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), 
      dateLabel: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      nilai: Number(item.score), // Pastikan jadi angka
      fullDate: date.toLocaleString('id-ID')
    }
  }).reverse() // Balik urutan: Kiri (Lama) -> Kanan (Baru)

  return (
    <div className="w-full h-80 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-4 ml-2">Tren Nilai (Hari Ini)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#f3f4f6" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: '#9ca3af' }} 
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd" // Agar label tidak bertumpuk
          />
          
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 11, fill: '#9ca3af' }} 
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px -3px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
            labelStyle={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}
            formatter={(value: number) => [`${value}`, 'Nilai']}
            labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                    return `${payload[0].payload.dateLabel}, ${label}`
                }
                return label
            }}
          />
          
          {/* Garis KKM */}
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'KKM (70)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
          
          <Line 
            type="monotone" 
            dataKey="nilai" 
            stroke="#4f46e5" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#4f46e5', stroke: '#e0e7ff', strokeWidth: 4 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}