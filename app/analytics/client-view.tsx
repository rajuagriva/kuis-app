'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, CheckCircle2, Target, BarChart2 } from 'lucide-react'

export default function AnalyticsClientView({ data }: { data: any[] }) {
  // State untuk menyimpan Subject ID mana yang sedang dibuka
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-400">Belum ada data mata kuliah.</div>
  }

  return (
    <div className="space-y-6">
      {data.map((subject) => (
        <div key={subject.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          
          {/* HEADER SUBJECT (BISA DIKLIK) */}
          <div 
            onClick={() => toggleSubject(subject.id)}
            className="p-4 sm:p-6 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              {expandedSubjects[subject.id] ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <h3 className="font-bold text-lg text-gray-800">{subject.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{subject.code} • {subject.stats.totalQuestions} Soal Total</p>
              </div>
            </div>

            {/* PROGRESS BAR SUBJECT */}
            <div className="flex items-center gap-4 w-full sm:w-1/3">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${subject.stats.progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-indigo-700 w-12 text-right">
                {subject.stats.progress}%
              </span>
            </div>
          </div>

          {/* ISI DETAIL (SOURCES & MODULES) */}
          {expandedSubjects[subject.id] && (
            <div className="p-4 sm:p-6 border-t border-gray-200 space-y-8 animate-in slide-in-from-top-2 duration-200">
              
              {subject.sources.map((source: any) => (
                <div key={source.id} className="relative">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
                    <BookOpen className="w-4 h-4" /> 
                    {source.name} <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-500">{source.type}</span>
                  </h4>

                  {/* TABLE MODUL */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">Nama Modul</th>
                          <th className="px-4 py-3 font-medium text-center">Status Soal</th>
                          <th className="px-4 py-3 font-medium text-center">Akurasi</th>
                          <th className="px-4 py-3 font-medium text-center">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {source.modules.map((mod: any) => (
                          <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-700">
                              {mod.name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                                <Target className="w-3 h-3" />
                                {mod.mastered} / {mod.totalQuestions}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                                mod.accuracy >= 80 ? 'text-green-600' : 
                                mod.accuracy >= 50 ? 'text-orange-600' : 'text-gray-400'
                              }`}>
                                <BarChart2 className="w-3 h-3" />
                                {mod.accuracy}%
                              </span>
                            </td>
                            <td className="px-4 py-3 w-1/4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      mod.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${mod.progress}%` }}
                                  />
                                </div>
                                {mod.progress === 100 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {source.modules.length === 0 && (
                          <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic">Belum ada modul.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {subject.sources.length === 0 && (
                <p className="text-gray-400 italic text-center">Belum ada materi untuk mata kuliah ini.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}