import { getDetailedAnalytics } from './actions'
import AnalyticsClientView from './client-view'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analisis Kemampuan | Quiz App',
  description: 'Statistik detail per modul dan mata kuliah',
}

export default async function AnalyticsPage() {
  const analyticsData = await getDetailedAnalytics()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-800 mb-2">
          📊 Analisis Kemampuan
        </h1>
        <p className="text-gray-500">
          Evaluasi detail progres belajar Anda per Modul dan Mata Kuliah.
        </p>
      </div>

      <AnalyticsClientView data={analyticsData} />
    </div>
  )
}