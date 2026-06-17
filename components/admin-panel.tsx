'use client'

import { useState, useEffect, useActionState, startTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  uploadQuizData, 
  getAdminModules, 
  getQuestionsByModule, 
  updateQuestion, 
  deleteQuestion, 
  deleteEntity, 
  getAdminSubjects, 
  updateSubject,
  getAllAiUsageLogs
} from '@/app/admin/actions'
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Upload, 
  FileJson, 
  BookOpen, 
  Settings, 
  List, 
  TrendingUp,
  FileText,
  Eye,
  EyeOff,
  Copy,
  Check,
  Cpu,
  Zap,
  Gauge,
  History,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertOctagon,
  Activity,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Coins,
  DollarSign,
  Info,
  Database
} from 'lucide-react'
import Link from 'next/link'
import { getRateLimitRegistry, saveRateLimitRegistry, pricing } from '@/utils/ai-keys'

interface Subject {
  id: string
  name: string
  code: string
  mastery_threshold: number
}

interface Module {
  id: string
  name: string
  source?: any
}

interface Question {
  id: string
  content: string
  explanation: string
}

interface AdminPanelProps {
  initialSubjects: any[]
  initialModules: any[]
}

export default function AdminPanel({ initialSubjects, initialModules }: AdminPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'subjects' | 'questions' | 'import' | 'settings' | 'monitor'>('subjects')

  // states untuk Copy JSON
  const [copiedGanda, setCopiedGanda] = useState(false)
  const [copiedEssay, setCopiedEssay] = useState(false)

  // states untuk Pengaturan API Key Gemini
  const [geminiKeys, setGeminiKeys] = useState({
    key1: '',
    key2: '',
    key3: '',
    key4: ''
  })
  const [showKeys, setShowKeys] = useState({
    key1: false,
    key2: false,
    key3: false,
    key4: false
  })
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // states untuk AI Monitor
  const [registry, setRegistry] = useState<Record<string, any>>({})
  const [time, setTime] = useState(Date.now())
  const [toast, setToast] = useState({ message: '', type: '' })
  const [activeSubTab, setActiveSubTab] = useState<'local' | 'cost'>('local')
  const [dbLogs, setDbLogs] = useState<any[]>([])
  const [loadingDb, setLoadingDb] = useState(false)

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 3500)
  }

  const fetchDbLogs = async () => {
    setLoadingDb(true)
    try {
      const logs = await getAllAiUsageLogs()
      setDbLogs(logs)
    } catch (err) {
      console.error("Gagal mengambil log dari Supabase:", err)
      showToast("❌ Gagal memuat data biaya dari Supabase!", "error")
    } finally {
      setLoadingDb(false)
    }
  }

  // Update registry status and tick timers every second
  useEffect(() => {
    if (activeTab !== 'monitor') return

    // Initial fetch
    setRegistry(getRateLimitRegistry())

    const timer = setInterval(() => {
      setTime(Date.now())
      setRegistry(getRateLimitRegistry())
    }, 1000)

    const handleUpdate = () => {
      setRegistry(getRateLimitRegistry())
      if (activeSubTab === 'cost') {
        fetchDbLogs()
      }
    }
    window.addEventListener('ai-rate-limits-updated', handleUpdate)

    return () => {
      clearInterval(timer)
      window.removeEventListener('ai-rate-limits-updated', handleUpdate)
    }
  }, [activeTab, activeSubTab])

  useEffect(() => {
    if (activeTab === 'monitor' && activeSubTab === 'cost') {
      fetchDbLogs()
    }
  }, [activeTab, activeSubTab])

  // Manual trigger to fetch registry data
  const handleRefresh = () => {
    setRegistry(getRateLimitRegistry())
    if (activeSubTab === 'cost') {
      fetchDbLogs()
    }
    showToast('🔄 Pemantauan Kuota berhasil disegarkan!', 'success')
  }

  const costStats = useMemo(() => {
    const monthly: Record<string, any> = {} // { "Juni 2026": { usd, idr, tokens, chars, calls, models: {} } }
    const modelsBreakdown: Record<string, any> = {} // { "gemini-2.5-flash": { calls, usd, idr, inputRate, outputRate, tokens } }

    dbLogs.forEach(log => {
      const date = new Date(log.created_at)
      const monthKey = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })
      
      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          usd: 0,
          idr: 0,
          tokens: 0,
          chars: 0,
          calls: 0,
          models: {}
        }
      }
      
      const promptTok = log.prompt_tokens || 0
      const respTok = log.response_tokens || 0
      const totalTok = promptTok + respTok
      const totalChars = (log.prompt_chars || 0) + (log.response_chars || 0)
      const costUsd = parseFloat(log.cost_usd) || 0
      const costIdr = parseFloat(log.cost_idr) || 0

      monthly[monthKey].usd += costUsd
      monthly[monthKey].idr += costIdr
      monthly[monthKey].tokens += totalTok
      monthly[monthKey].chars += totalChars
      monthly[monthKey].calls += 1

      // Model in month
      const model = log.model
      if (!monthly[monthKey].models[model]) {
        monthly[monthKey].models[model] = {
          calls: 0,
          usd: 0,
          idr: 0,
          tokens: 0
        }
      }
      monthly[monthKey].models[model].calls += 1
      monthly[monthKey].models[model].usd += costUsd
      monthly[monthKey].models[model].idr += costIdr
      monthly[monthKey].models[model].tokens += totalTok

      // Global model breakdown
      if (!modelsBreakdown[model]) {
        modelsBreakdown[model] = {
          provider: log.provider,
          calls: 0,
          usd: 0,
          idr: 0,
          tokens: 0,
          promptTokens: 0,
          responseTokens: 0,
          inputRate: pricing[model]?.input ?? (parseFloat(log.input_cost_per_m) || 0),
          outputRate: pricing[model]?.output ?? (parseFloat(log.output_cost_per_m) || 0)
        }
      }
      modelsBreakdown[model].calls += 1
      modelsBreakdown[model].usd += costUsd
      modelsBreakdown[model].idr += costIdr
      modelsBreakdown[model].tokens += totalTok
      modelsBreakdown[model].promptTokens += promptTok
      modelsBreakdown[model].responseTokens += respTok
    })

    return {
      monthly: Object.entries(monthly).map(([month, data]: [string, any]) => ({ month, ...data })),
      models: Object.entries(modelsBreakdown).map(([model, data]: [string, any]) => ({ model, ...data }))
    }
  }, [dbLogs])

  const handleResetLimits = () => {
    const defaultRegistry = {
      "gemini-2.5-flash": {
        provider: 'gemini',
        name: 'Gemini 2.5 Flash',
        remainingRequests: 15,
        maxRequests: 15,
        remainingTokens: 30000,
        maxTokens: 30000,
        resetRequestsTime: 0,
        resetTokensTime: 0,
        isLimited: false,
        history: registry["gemini-2.5-flash"]?.history || []
      },
      "gemini-2.5-flash-lite": {
        provider: 'gemini',
        name: 'Gemini 2.5 Flash Lite',
        remainingRequests: 15,
        maxRequests: 15,
        remainingTokens: 30000,
        maxTokens: 30000,
        resetRequestsTime: 0,
        resetTokensTime: 0,
        isLimited: false,
        history: registry["gemini-2.5-flash-lite"]?.history || []
      },
      "gemini-1.5-flash": {
        provider: 'gemini',
        name: 'Gemini 1.5 Flash',
        remainingRequests: 15,
        maxRequests: 15,
        remainingTokens: 30000,
        maxTokens: 30000,
        resetRequestsTime: 0,
        resetTokensTime: 0,
        isLimited: false,
        history: registry["gemini-1.5-flash"]?.history || []
      },
      "gemini-1.5-flash-8b": {
        provider: 'gemini',
        name: 'Gemini 1.5 Flash 8B',
        remainingRequests: 15,
        maxRequests: 15,
        remainingTokens: 30000,
        maxTokens: 30000,
        resetRequestsTime: 0,
        resetTokensTime: 0,
        isLimited: false,
        history: registry["gemini-1.5-flash-8b"]?.history || []
      }
    }
    saveRateLimitRegistry(defaultRegistry)
    setRegistry(defaultRegistry)
    window.dispatchEvent(new Event('ai-rate-limits-updated'))
    showToast('⚡ Seluruh batasan limit lokal telah di-reset!', 'success')
  }

  const modelsData = useMemo(() => {
    return Object.keys(registry).map(key => {
      const entry = registry[key]
      const now = Date.now()

      const reqResetSeconds = entry.resetRequestsTime ? Math.max(0, Math.ceil((entry.resetRequestsTime - now) / 1000)) : 0
      const tokResetSeconds = entry.resetTokensTime ? Math.max(0, Math.ceil((entry.resetTokensTime - now) / 1000)) : 0
      const maxResetSeconds = Math.max(reqResetSeconds, tokResetSeconds)

      let status = 'healthy' // 'healthy' | 'warning' | 'blocked'
      const isBlocked = entry.isLimited && now < entry.resetRequestsTime
      const requestRatio = entry.remainingRequests / (entry.maxRequests || 15)

      if (isBlocked) {
        status = 'blocked'
      } else if (requestRatio <= 0.25 || entry.remainingRequests === 0) {
        status = 'warning'
      }

      return {
        id: key,
        ...entry,
        status,
        maxResetSeconds,
        reqResetSeconds,
        tokResetSeconds
      }
    })
  }, [registry, time])

  const priorityRouteSequence = useMemo(() => {
    // Default models we support
    const models = [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' }
    ]

    const now = Date.now()
    const available: any[] = []
    const blocked: any[] = []

    models.forEach(cand => {
      const state = registry[cand.id]
      const isBlocked = state && state.isLimited && now < state.resetRequestsTime

      if (isBlocked) {
        blocked.push({ 
          ...cand, 
          isBlocked: true, 
          secondsLeft: Math.ceil((state.resetRequestsTime - now) / 1000) 
        })
      } else {
        available.push({ ...cand, isBlocked: false })
      }
    })

    return [...available, ...blocked]
  }, [registry, time])

  const allLogs = useMemo(() => {
    const logs: any[] = []
    Object.keys(registry).forEach(modelKey => {
      const entry = registry[modelKey]
      if (entry.history && Array.isArray(entry.history)) {
        entry.history.forEach((log: any) => {
          logs.push({
            ...log,
            modelKey,
            modelName: entry.name || modelKey
          })
        })
      }
    })
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15)
  }, [registry])

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Load keys from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGeminiKeys({
        key1: localStorage.getItem('cfg_gemini_key_1') || '',
        key2: localStorage.getItem('cfg_gemini_key_2') || '',
        key3: localStorage.getItem('cfg_gemini_key_3') || '',
        key4: localStorage.getItem('cfg_gemini_key_4') || ''
      })
    }
  }, [])

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      localStorage.setItem('cfg_gemini_key_1', geminiKeys.key1.trim())
      localStorage.setItem('cfg_gemini_key_2', geminiKeys.key2.trim())
      localStorage.setItem('cfg_gemini_key_3', geminiKeys.key3.trim())
      localStorage.setItem('cfg_gemini_key_4', geminiKeys.key4.trim())
      
      setSettingsMessage({ text: 'Pengaturan API Key berhasil disimpan!', type: 'success' })
      setTimeout(() => setSettingsMessage(null), 3000)
    } catch (err) {
      setSettingsMessage({ text: 'Gagal menyimpan pengaturan ke localStorage.', type: 'error' })
    }
  }

  const handleCopyGanda = () => {
    const code = `[
  {
    "code": "STSI4209",
    "name": "Pemrograman Web",
    "sources": [
      {
        "name": "Kumpulan Soal UAS",
        "type": "exam",
        "modules": [
          {
            "name": "Modul 1: Dasar HTML",
            "questions": [
              {
                "content": "Tag HTML untuk paragraf adalah...",
                "explanation": "Tag <p> digunakan untuk paragraf.",
                "options": [
                  { "text": "<p>", "is_correct": true },
                  { "text": "<a>", "is_correct": false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]`;
    navigator.clipboard.writeText(code)
    setCopiedGanda(true)
    setTimeout(() => setCopiedGanda(false), 2000)
  }

  const handleCopyEssay = () => {
    const code = `[
  {
    "code": "STSI4208",
    "name": "Analisis Sistem",
    "sources": [
      {
        "name": "Latihan Essay Mandiri",
        "type": "exam",
        "modules": [
          {
            "name": "Dasar Analisis",
            "questions": [
              {
                "content": "Jelaskan perbedaan Functional dan Non-functional Requirement!",
                "explanation": "Functional requirement mendefinisikan fungsi (apa yang sistem lakukan, contoh: kirim OTP). Non-functional mendefinisikan batasan kinerja (contoh: loading < 2 detik).",
                "type": "essay"
              }
            ]
          }
        ]
      }
    ]
  }
]`;
    navigator.clipboard.writeText(code)
    setCopiedEssay(true)
    setTimeout(() => setCopiedEssay(false), 2000)
  }

  // ==========================================
  // TAB 1: MANAJEMEN MATA KULIAH STATE & LOGIC
  // ==========================================
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [subjectMessage, setSubjectMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubjectChange = (id: string, field: keyof Subject, value: any) => {
    setSubjects(prev => prev.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ))
  }

  const handleSaveSubject = async (subject: Subject) => {
    setSavingId(subject.id)
    setSubjectMessage(null)
    try {
      await updateSubject(subject.id, subject.name, subject.code, Number(subject.mastery_threshold))
      setSubjectMessage({ text: `Berhasil memperbarui ${subject.code}!`, type: 'success' })
      setTimeout(() => setSubjectMessage(null), 3000)
    } catch (error: any) {
      setSubjectMessage({ text: error.message || 'Gagal menyimpan perubahan.', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  // ==========================================
  // TAB 2: BANK SOAL & MODUL STATE & LOGIC
  // ==========================================
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [selectedModule, setSelectedModule] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [editingQ, setEditingQ] = useState<Question | null>(null)
  const [savingQuestion, setSavingQuestion] = useState(false)

  // Reload modules list
  const reloadModules = async () => {
    try {
      const data = await getAdminModules()
      setModules(data as Module[])
    } catch (error) {
      console.error('Failed to load modules:', error)
    }
  }

  // Load questions when selectedModule changes
  useEffect(() => {
    if (!selectedModule) {
      setQuestions([])
      return
    }
    const loadQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const data = await getQuestionsByModule(selectedModule)
        setQuestions(data as Question[])
      } catch (err) {
        console.error('Failed to load questions:', err)
      } finally {
        setLoadingQuestions(false)
      }
    }
    loadQuestions()
  }, [selectedModule])

  const handleDeleteEntity = async (type: 'subjects' | 'sources' | 'modules', id: string, name: string) => {
    const label = type === 'subjects' ? 'Mata Kuliah' : type === 'sources' ? 'Kategori/Sumber' : 'Modul'
    if (!confirm(`⚠️ PERINGATAN KERAS!\n\nAnda akan menghapus ${label}: "${name}".\n\nSemua data di dalamnya (Modul, Soal, Jawaban) akan IKUT TERHAPUS PERMANEN.\n\nApakah Anda yakin ingin melanjutkan?`)) {
      return
    }

    try {
      await deleteEntity(type, id)
      alert(`${label} "${name}" berhasil dihapus secara permanen.`)
      setSelectedModule('')
      // Reload both subjects list and modules list
      const updatedSubjects = await getAdminSubjects()
      setSubjects(updatedSubjects as Subject[])
      await reloadModules()
    } catch (error: any) {
      alert('Gagal menghapus: ' + error.message)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return
    try {
      await deleteQuestion(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (error) {
      alert('Gagal menghapus soal.')
    }
  }

  const handleSaveQuestionEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQ) return
    setSavingQuestion(true)
    try {
      await updateQuestion(editingQ.id, editingQ.content, editingQ.explanation || '')
      setQuestions(prev => prev.map(q => (q.id === editingQ.id ? editingQ : q)))
      setEditingQ(null)
    } catch (error) {
      alert('Gagal menyimpan perubahan soal.')
    } finally {
      setSavingQuestion(false)
    }
  }

  const currentModObj = modules.find(m => m.id === selectedModule)
  const currentSource = currentModObj?.source
  const currentSubject = currentSource?.subject

  // ==========================================
  // TAB 3: IMPORT SOAL STATE & LOGIC
  // ==========================================
  const [uploadState, uploadFormAction, isUploadPending] = useActionState(uploadQuizData, null)

  const handleUploadSubmit = (formData: FormData) => {
    startTransition(() => {
      uploadFormAction(formData)
    })
  }

  // Reload data when import succeeds
  useEffect(() => {
    if (uploadState?.success) {
      // Reload subjects and modules in background
      getAdminSubjects().then(data => setSubjects(data as Subject[]))
      reloadModules()
    }
  }, [uploadState])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 relative overflow-hidden" suppressHydrationWarning>
      
      {/* Background Neon Glows (Subtle for Light Mode) */}
      <div className="absolute top-[5%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-5 bg-indigo-450 animate-pulse-soft"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-5 bg-violet-450 animate-pulse-soft"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/10">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Kelola Ujian</h1>
              <p className="text-sm text-slate-500">Pusat Administrasi Latihan Ujian & Soal Mandiri</p>
            </div>
          </div>

          <Link 
            href="/dashboard"
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-white border border-slate-250 text-slate-650 hover:text-slate-900 font-bold text-xs tracking-wider uppercase transition-all duration-300 hover:scale-[1.01] flex items-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali Ke Dashboard
          </Link>
        </div>

        {/* TABS NAVIGATION */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 ${
              activeTab === 'subjects'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-center">Mata Kuliah</span>
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 ${
              activeTab === 'questions'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="text-center">Bank Soal</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="text-center">Import Soal</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-center">Pengaturan AI</span>
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex flex-col md:flex-row items-center justify-center gap-2 ${
              activeTab === 'monitor'
                ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-center">Monitor AI</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="space-y-6">
          
          {/* TAB 1: MANAJEMEN MATA KULIAH */}
          {activeTab === 'subjects' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Daftar Mata Kuliah</h2>
                  <p className="text-xs text-slate-550">Edit kode, nama, dan batas target mastery (mastery threshold) mata kuliah.</p>
                </div>
                
                {subjectMessage && (
                  <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-2 border ${
                    subjectMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {subjectMessage.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                    {subjectMessage.text}
                  </div>
                )}
              </div>

              {subjects.length === 0 ? (
                <div className="glass-card rounded-2xl border border-slate-200 p-8 text-center text-slate-500 bg-white shadow-sm">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3 animate-float" />
                  <p className="text-sm font-semibold">Belum ada mata kuliah terdaftar.</p>
                  <p className="text-xs text-slate-400 mt-1">Silakan gunakan tab "Import Soal" untuk memasukkan data pelajaran pertama Anda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="glass-card rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col bg-white relative group"
                    >
                      {/* Accent glow on hover */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 opacity-30 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="p-5 flex-1 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded border border-slate-200 bg-slate-55/50 text-slate-600 tracking-wider">
                            {sub.code}
                          </span>
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <TrendingUp className="w-4 h-4 text-slate-450" />
                          </div>
                        </div>

                        {/* Input Nama */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Mata Kuliah</label>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleSubjectChange(sub.id, 'name', e.target.value)}
                            className="w-full text-sm font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-indigo-500 py-1 transition-colors outline-none focus:ring-0"
                          />
                        </div>

                        {/* Kode & Target Master */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Kode</label>
                            <input
                              type="text"
                              value={sub.code}
                              onChange={(e) => handleSubjectChange(sub.id, 'code', e.target.value)}
                              className="w-full text-sm font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-indigo-500 py-1 transition-colors outline-none focus:ring-0"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-600">Target Master</label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={sub.mastery_threshold || 1}
                                onChange={(e) => handleSubjectChange(sub.id, 'mastery_threshold', e.target.value)}
                                className="w-full text-xs font-bold text-indigo-705 border border-indigo-200 bg-indigo-50/50 rounded-lg py-1.5 px-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Target: {sub.mastery_threshold}x Benar
                        </span>

                        <button
                          onClick={() => handleSaveSubject(sub)}
                          disabled={savingId === sub.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-700/50 text-white text-[11px] font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-550/10"
                        >
                          {savingId === sub.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Simpan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BANK SOAL & EDIT SOAL */}
          {activeTab === 'questions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Daftar Soal & Modul</h2>
                <p className="text-xs text-slate-550">Pilih modul untuk mengedit butir soal atau menghapus entitas data.</p>
              </div>

              {/* AREA PILIH MODUL */}
              <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-6 bg-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 rounded-full blur-2xl opacity-5 bg-indigo-500"></div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Pilih Modul Aktif</label>
                  <select
                    className="block w-full glass-input rounded-xl p-3 text-sm focus:border-indigo-500 transition-all border border-slate-200"
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                  >
                    <option value="" className="bg-white">-- Pilih Modul / Cari Soal --</option>
                    {modules.map((mod) => (
                      <option key={mod.id} value={mod.id} className="bg-white">
                        {mod.source?.subject?.name || 'Unknown'} ➜ {mod.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Panel & Delete Entities */}
                {selectedModule && currentModObj && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-150 pt-5">
                    
                    {/* Item 1: Mata Kuliah */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 relative group">
                      <div className="overflow-hidden">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Mata Kuliah</span>
                        <span className="text-xs font-bold text-slate-800 block truncate" title={currentSubject?.name}>
                          {currentSubject?.name || '-'}
                        </span>
                      </div>
                      {currentSubject && (
                        <button
                          onClick={() => handleDeleteEntity('subjects', currentSubject.id, currentSubject.name)}
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all shrink-0"
                          title="Hapus Mata Kuliah & Semua Isinya"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Item 2: Kategori / Sumber */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 relative group">
                      <div className="overflow-hidden">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Kategori / Sumber</span>
                        <span className="text-xs font-bold text-slate-800 block truncate" title={currentSource?.name}>
                          {currentSource?.name || '-'}
                        </span>
                      </div>
                      {currentSource && (
                        <button
                          onClick={() => handleDeleteEntity('sources', currentSource.id, currentSource.name)}
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all shrink-0"
                          title="Hapus Kategori & Semua Modulnya"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Item 3: Modul */}
                    <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 relative group">
                      <div className="overflow-hidden">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-0.5">Modul</span>
                        <span className="text-xs font-bold text-indigo-900 block truncate" title={currentModObj.name}>
                          {currentModObj.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEntity('modules', currentModObj.id, currentModObj.name)}
                        className="p-2 text-indigo-650 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all shrink-0"
                        title="Hapus Modul & Soal-Soalnya"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* LIST SOAL */}
              {selectedModule && (
                <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-md">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Daftar Soal ({questions.length})
                    </h3>
                  </div>

                  {loadingQuestions ? (
                    <div className="p-16 flex flex-col justify-center items-center gap-3 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-xs font-bold">Memuat bank soal...</span>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      Tidak ada soal yang terdaftar pada modul ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                            <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Konten Soal</th>
                            <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {questions.map((q, idx) => (
                            <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-slate-400 align-top">{idx + 1}</td>
                              <td className="px-6 py-4 text-sm text-slate-800 align-top">
                                <p className="whitespace-pre-wrap leading-relaxed mb-3 font-medium">{q.content}</p>
                                {q.explanation && (
                                  <div className="text-xs text-indigo-950 bg-indigo-50/50 border border-indigo-150 p-3.5 rounded-xl inline-block max-w-full leading-relaxed">
                                    <strong className="block text-[10px] font-black uppercase tracking-widest text-indigo-650 mb-1">💡 Pembahasan / Kunci:</strong>
                                    {q.explanation}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium align-top">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button
                                    onClick={() => setEditingQ(q)}
                                    className="p-2 text-indigo-600 hover:text-indigo-905 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-200"
                                    title="Edit Soal"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-2 text-slate-400 hover:text-red-655 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                                    title="Hapus Soal"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT SOAL MASSAL */}
          {activeTab === 'import' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Box Form Upload */}
              <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-md">
                
                {/* Header tab */}
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 text-slate-900 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <FileJson className="w-5 h-5 text-indigo-600" />
                      Import Soal Massal
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Upload file JSON untuk menambahkan mata kuliah, modul, dan soal secara instan.</p>
                  </div>
                </div>

                <div className="p-8">
                  {/* Form Upload */}
                  <form action={handleUploadSubmit} className="space-y-6">
                    
                    {/* Area Drop File */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-indigo-500/50 hover:bg-indigo-5/10 transition-all group cursor-pointer bg-slate-50/30">
                      <input
                        type="file"
                        name="file"
                        accept=".json"
                        required
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-full group-hover:scale-105 transition-all text-indigo-600">
                          <Upload className="h-7 w-7" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                            Klik untuk pilih file JSON
                          </span>
                          <span className="text-slate-400 block text-xs mt-1">atau seret berkas Anda di sini</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 bg-slate-100/50 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">
                          Hanya Format .JSON
                        </p>
                      </div>
                    </div>

                    {/* Tombol Submit */}
                    <button
                      type="submit"
                      disabled={isUploadPending}
                      className="w-full flex justify-center items-center py-3.5 px-4 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-750 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isUploadPending ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Memproses & Menyimpan Data...
                        </>
                      ) : (
                        'Upload & Proses Bank Soal'
                      )}
                    </button>
                  </form>

                  {/* Alert feedback */}
                  {uploadState && (
                    <div className={`mt-6 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-300 ${
                      uploadState.success 
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                        : 'bg-red-50 border-red-255 text-red-800'
                    }`}>
                      {uploadState.success ? (
                        <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-655" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold">{uploadState.success ? 'Berhasil!' : 'Gagal memproses data'}</h4>
                        <p className="text-xs opacity-90 mt-1 leading-relaxed">{uploadState.message}</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Panduan Format JSON */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Panduan Format JSON Impor Soal
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Kolom 1: Pilihan Ganda */}
                  <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
                    <div className="bg-indigo-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        Format Soal Pilihan Ganda
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopyGanda}
                        className="px-3 py-1.5 bg-white border border-slate-250 text-[10px] font-black uppercase tracking-wider text-indigo-650 hover:text-indigo-800 hover:bg-slate-55 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {copiedGanda ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Salin JSON
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Format untuk soal pilihan ganda standar. Wajib menyertakan opsi jawaban (<code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-mono font-bold">options</code>) dan menandai salah satu opsi yang benar dengan <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-mono font-bold">"is_correct": true</code>.
                      </p>
                      <pre className="bg-slate-900 p-4 rounded-xl text-[10px] font-mono text-indigo-200 overflow-x-auto leading-relaxed max-h-[300px] border border-slate-850">
{`[
  {
    "code": "STSI4209",
    "name": "Pemrograman Web",
    "sources": [
      {
        "name": "Kumpulan Soal UAS",
        "type": "exam",
        "modules": [
          {
            "name": "Modul 1: Dasar HTML",
            "questions": [
              {
                "content": "Tag HTML untuk paragraf adalah...",
                "explanation": "Tag <p> digunakan untuk paragraf.",
                "options": [
                  { "text": "<p>", "is_correct": true },
                  { "text": "<a>", "is_correct": false }
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

                  {/* Kolom 2: Essay */}
                  <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
                    <div className="bg-violet-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                        Format Soal Essay (AI Graded)
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopyEssay}
                        className="px-3 py-1.5 bg-white border border-slate-250 text-[10px] font-black uppercase tracking-wider text-violet-650 hover:text-violet-850 hover:bg-slate-55 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {copiedEssay ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Salin JSON
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Format untuk soal essay mandiri. Wajib menyertakan field <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded font-mono font-bold">"type": "essay"</code>, **tanpa** array <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded font-mono font-bold">"options"</code>, serta menulis acuan penilaian AI pada kolom <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded font-mono font-bold">"explanation"</code>.
                      </p>
                      <pre className="bg-slate-900 p-4 rounded-xl text-[10px] font-mono text-violet-200 overflow-x-auto leading-relaxed max-h-[300px] border border-slate-850">
{`[
  {
    "code": "STSI4208",
    "name": "Analisis Sistem",
    "sources": [
      {
        "name": "Latihan Essay Mandiri",
        "type": "exam",
        "modules": [
          {
            "name": "Dasar Analisis",
            "questions": [
              {
                "content": "Jelaskan perbedaan Functional dan Non-functional Requirement!",
                "explanation": "Functional requirement mendefinisikan fungsi (apa yang sistem lakukan, contoh: kirim OTP). Non-functional mendefinisikan batasan kinerja (contoh: loading < 2 detik).",
                "type": "essay"
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

                <div className="text-[10px] text-slate-550 leading-relaxed space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-700">Poin Penting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Kode matkul bersifat unik (case-insensitive). Jika matkul sudah ada di sistem, modul baru otomatis digabungkan di dalamnya.</li>
                    <li>Pembahasan/kriteria acuan (<code className="font-mono text-[9px] bg-slate-200 px-0.5 rounded">explanation</code>) sangat direkomendasikan karena akan dibaca oleh AI untuk menilai keakuratan jawaban essay siswa.</li>
                    <li>Sistem mengenali tipe essay jika butir soal memiliki <code className="font-mono text-[9px] bg-slate-200 px-0.5 rounded">"type": "essay"</code>. Secara default jika dikosongkan akan didaftarkan sebagai pilihan ganda.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENGATURAN AI KEY */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-md">
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 text-slate-900 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-650" />
                      Pengaturan API Key Gemini AI
                    </h2>
                    <p className="text-xs text-slate-550 mt-1 font-medium">
                      Konfigurasikan hingga 4 API Key Gemini AI untuk didistribusikan secara dinamis guna menghindari limitasi kuota akun gratisan.
                    </p>
                  </div>
                  {settingsMessage && (
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center border animate-in fade-in ${
                      settingsMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {settingsMessage.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                      {settingsMessage.text}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveKeys} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((num) => {
                      const fieldName = `key${num}` as keyof typeof geminiKeys
                      const isSet = !!geminiKeys[fieldName]

                      return (
                        <div key={num} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              Gemini API Key {num}
                            </label>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isSet 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-205' 
                                : 'bg-slate-55 text-slate-400 border-slate-200'
                            }`}>
                              {isSet ? 'Terpasang' : 'Kosong'}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type={showKeys[fieldName] ? 'text' : 'password'}
                              value={geminiKeys[fieldName]}
                              onChange={(e) => setGeminiKeys({ ...geminiKeys, [fieldName]: e.target.value })}
                              placeholder="Masukkan GEMINI_API_KEY..."
                              className="w-full glass-input border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:border-indigo-500 transition-all font-mono outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys({ ...showKeys, [fieldName]: !showKeys[fieldName] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655"
                            >
                              {showKeys[fieldName] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-205 text-xs text-slate-550 leading-relaxed flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Catatan Keamanan & Cara Kerja:</span>
                      API key disimpan sepenuhnya di browser lokal Anda (localStorage) dan **tidak pernah disimpan di database server**. Kunci akan dikirim ke server actions hanya saat Anda menjalankan AI Tutor atau AI Grading untuk menghindari error CORS. Jika semua kunci di atas kosong, sistem akan menggunakan kunci API default dari environment variables server (`GEMINI_API_KEY`).
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-150">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:scale-[1.01] flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Simpan Konfigurasi Key
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 5: MONITOR AI */}
          {activeTab === 'monitor' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* Toast Notification */}
               {toast.message && (
                 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border text-white transition-all transform translate-y-0 ${
                   toast.type === 'error' ? 'bg-red-600 border-red-700' : 'bg-emerald-600 border-emerald-700'
                 }`}>
                   {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                   <span className="font-semibold text-sm">{toast.message}</span>
                 </div>
               )}

               {/* Header Monitor */}
               <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-slate-700/40">
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
                 <div className="space-y-1.5 z-10">
                   <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-white">
                     <Cpu className="w-8 h-8 text-indigo-400 animate-pulse" /> Monitor Kuota & Router AI
                   </h2>
                   <p className="text-slate-350 text-xs max-w-2xl font-medium">
                     Pantau sisa request (RPM), sisa token (TPM), dan visualisasi rute prioritas AI. Sistem otomatis memintas model yang terlimit untuk menjamin kelancaran aplikasi.
                   </p>
                 </div>
                 <div className="flex items-center gap-2.5 z-10 w-full md:w-auto">
                   <button
                     onClick={handleResetLimits}
                     className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-red-500/40 text-slate-350 hover:text-red-400 font-bold rounded-xl transition-all text-xs cursor-pointer"
                     title="Reset semua status limit lokal agar model bisa digunakan kembali"
                   >
                     <Trash2 size={14} />
                     Reset Limit Lokal
                   </button>

                   <button
                     onClick={handleRefresh}
                     className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all text-xs shadow-md cursor-pointer"
                   >
                     <RefreshCw size={14} className={loadingDb ? "animate-spin" : ""} />
                     Segarkan
                   </button>
                 </div>
               </div>

               {/* Sub-Tab Selector */}
               <div className="flex bg-slate-100 p-1 rounded-xl max-w-md border border-slate-200">
                 <button
                   onClick={() => setActiveSubTab('local')}
                   className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                     activeSubTab === 'local' ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   <Gauge size={14} /> Batasan Limit Lokal
                 </button>
                 <button
                   onClick={() => setActiveSubTab('cost')}
                   className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                     activeSubTab === 'cost' ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-755'
                   }`}
                 >
                   <Coins size={14} /> Monitoring Biaya Supabase
                 </button>
               </div>

               {activeSubTab === 'local' ? (
                 <>
                   {/* Dynamic Routing Priority Flow Visualizer */}
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                     <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                       <div className="space-y-0.5">
                         <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                           <Zap className="text-amber-500 w-5 h-5" /> Urutan Rute Prioritas AI (Proaktif)
                         </h3>
                         <p className="text-xs text-slate-450 font-medium">Model di kiri akan dicoba terlebih dahulu. Model yang terlimit otomatis dipindah ke kanan untuk dilewati.</p>
                       </div>
                       <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-750 font-bold rounded-full border border-indigo-100">
                         {priorityRouteSequence.length} Model Aktif
                       </span>
                     </div>

                     {priorityRouteSequence.length === 0 ? (
                       <div className="p-8 text-center text-slate-400 italic text-sm">
                         Tidak ada model AI yang aktif. AI tidak akan berfungsi!
                       </div>
                     ) : (
                       <div className="flex flex-wrap items-center gap-3 pt-2">
                         {priorityRouteSequence.map((item: any, index: number) => (
                           <div key={item.id} className="flex items-center gap-3">
                             {index > 0 && <ArrowRight size={16} className="text-slate-300 hidden md:block" />}
                             <div className={`flex items-center gap-2.5 px-4.5 py-3 rounded-xl border transition-all ${
                               item.isBlocked
                                 ? 'border-red-200 bg-red-50 text-red-700 opacity-60 shadow-sm'
                                 : index === 0
                                   ? 'border-indigo-200 bg-indigo-50/50 text-indigo-855 font-bold shadow-sm'
                                   : 'border-slate-200 bg-slate-50 text-slate-700'
                             }`}>
                               {item.isBlocked ? (
                                 <ShieldAlert size={15} className="text-red-500 shrink-0" />
                               ) : index === 0 ? (
                                 <Sparkles size={15} className="text-indigo-550 animate-pulse shrink-0" />
                               ) : (
                                 <CheckCircle size={15} className="text-slate-400 shrink-0" />
                               )}
                               <div className="text-xs text-left">
                                 <p className="font-bold flex items-center gap-1.5">
                                   {index + 1}. {item.name}
                                   {item.isBlocked && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Blocked</span>}
                                   {index === 0 && !item.isBlocked && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded animate-pulse">Utama</span>}
                                 </p>
                                 <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                   {item.isBlocked ? `Terkunci: Coba lagi dlm ${item.secondsLeft}s` : 'Siap digunakan'}
                                 </p>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Bento Grid: Model Quota Performance */}
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {modelsData.map((model: any) => {
                       const reqRatio = model.remainingRequests / (model.maxRequests || 15)
                       const tokRatio = model.remainingTokens / (model.maxTokens || 30000)

                       return (
                         <div key={model.id} className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
                           model.status === 'blocked'
                             ? 'border-red-200/80 bg-red-50/[0.08]'
                             : model.status === 'warning'
                               ? 'border-amber-200/85 bg-amber-50/[0.08]'
                               : 'border-slate-205'
                         }`}>
                           {/* Card Header */}
                           <div className="space-y-4">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <span className={`w-2.5 h-2.5 rounded-full ${
                                   model.status === 'blocked'
                                     ? 'bg-red-500 animate-ping'
                                     : model.status === 'warning'
                                       ? 'bg-amber-500'
                                       : 'bg-emerald-500'
                                 }`} />
                                 <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">
                                   {model.provider.toUpperCase()} MODEL
                                 </span>
                               </div>

                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                 model.status === 'blocked'
                                   ? 'bg-red-100 text-red-700 border-red-150'
                                   : model.status === 'warning'
                                     ? 'bg-amber-100 text-amber-700 border-amber-150'
                                     : 'bg-emerald-105 text-emerald-750 border-emerald-150'
                                }`}>
                                 {model.status === 'blocked' ? 'Terlimit' : model.status === 'warning' ? 'Kuota Menipis' : 'Aktif / Sehat'}
                               </span>
                             </div>

                             <div>
                               <h3 className="text-base font-black text-slate-800 tracking-tight">{model.name}</h3>
                               <p className="text-[9px] text-slate-450 font-mono mt-0.5 font-bold">{model.id}</p>
                             </div>
                           </div>

                           {/* Middle Metrics & Progress Bars */}
                           <div className="my-6 space-y-4">
                             {/* 1. Request Limit Bar */}
                             <div className="space-y-1.5">
                               <div className="flex justify-between text-xs font-semibold text-slate-650">
                                 <span className="flex items-center gap-1.5"><Gauge size={13} className="text-slate-400" /> Sisa Request (RPM)</span>
                                 <span className="font-bold">{model.remainingRequests} / {model.maxRequests}</span>
                               </div>
                               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-150/50">
                                 <div
                                   className={`h-full rounded-full transition-all duration-300 ${
                                     model.status === 'blocked'
                                       ? 'bg-red-400'
                                       : reqRatio <= 0.25
                                         ? 'bg-amber-500'
                                         : 'bg-indigo-600'
                                   }`}
                                   style={{ width: `${(model.remainingRequests / (model.maxRequests || 15)) * 100}%` }}
                                 />
                               </div>
                             </div>

                             {/* 2. Token Limit Bar */}
                             <div className="space-y-1.5">
                               <div className="flex justify-between text-xs font-semibold text-slate-655">
                                 <span className="flex items-center gap-1.5"><Activity size={13} className="text-slate-400" /> Sisa Token (TPM)</span>
                                 <span className="font-bold font-mono text-[11px]">
                                   {model.remainingTokens.toLocaleString()} / {model.maxTokens.toLocaleString()}
                                 </span>
                               </div>
                               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-150/50">
                                 <div
                                   className={`h-full rounded-full transition-all duration-300 ${
                                     model.status === 'blocked'
                                       ? 'bg-red-400'
                                       : tokRatio <= 0.25
                                         ? 'bg-amber-500'
                                         : 'bg-indigo-600'
                                   }`}
                                   style={{ width: `${(model.remainingTokens / (model.maxTokens || 30000)) * 100}%` }}
                                 />
                               </div>
                             </div>
                           </div>

                           {/* Card Footer / Lock status info */}
                           <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                             {model.status === 'blocked' ? (
                               <span className="flex items-center gap-1 text-red-650 font-bold">
                                 <Clock size={12} className="animate-spin text-red-500" />
                                 Reset dlm {model.maxResetSeconds} detik
                               </span>
                             ) : (
                               <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                                 <CheckCircle size={12} className="text-emerald-500" />
                                 Bisa digunakan
                               </span>
                             )}
                             
                             <span className="text-[10px] text-indigo-650 font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded font-mono" title="Gemini rate limits tracked via simulation & 429 errors">Simulation</span>
                           </div>
                         </div>
                       )
                     })}
                   </div>

                   {/* Real-time API Transaction Logs */}
                   <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden">
                     {/* Table Header toolbar */}
                     <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <History className="text-indigo-550 w-5 h-5 animate-pulse" />
                         <h3 className="font-extrabold text-slate-800 text-sm">Riwayat Transaksi API Terakhir (Lokal)</h3>
                         <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded-full font-bold">
                           {allLogs.length} Log
                         </span>
                       </div>
                       <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider hidden sm:block">Client-Side Store</span>
                     </div>

                     {/* Log Table */}
                     {allLogs.length === 0 ? (
                       <div className="p-16 text-center text-slate-400 italic space-y-1">
                         <HelpCircle className="mx-auto text-slate-300 w-8 h-8 mb-2 animate-bounce-soft" />
                         <p className="font-semibold text-sm text-slate-500">Belum ada riwayat transaksi AI</p>
                         <p className="text-xs text-slate-400">Riwayat pemanggilan akan muncul secara otomatis saat Anda menggunakan aplikasi kuis yang memanggil AI.</p>
                       </div>
                     ) : (
                       <div className="overflow-x-auto">
                         <table className="w-full text-xs text-left border-collapse">
                           <thead>
                             <tr className="bg-slate-800 text-white font-bold">
                               <th className="p-3.5">Waktu</th>
                               <th className="p-3.5">Model AI</th>
                               <th className="p-3.5 text-center">Status</th>
                               <th className="p-3.5 text-right">Prompt (Karakter)</th>
                               <th className="p-3.5 text-right">Response (Karakter)</th>
                               <th className="p-3.5">Detail Respon / Error</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                             {allLogs.map((log: any, index: number) => (
                               <tr key={index} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-3.5 text-slate-500 font-medium font-mono">{formatTime(log.timestamp)}</td>
                                 <td className="p-3.5">
                                   <div className="font-bold text-slate-800">{log.modelName}</div>
                                   <div className="text-[9px] text-slate-400 font-mono mt-0.5">{log.modelKey}</div>
                                 </td>
                                 <td className="p-3.5 text-center">
                                   <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                     log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                   }`}>
                                     {log.status === 'success' ? <CheckCircle size={10} /> : <AlertOctagon size={10} />}
                                     {log.status === 'success' ? 'Sukses' : 'Gagal'}
                                   </span>
                                 </td>
                                 <td className="p-3.5 text-right font-bold text-slate-650 font-mono">{log.promptLength.toLocaleString()}</td>
                                 <td className="p-3.5 text-right font-bold text-slate-650 font-mono">{log.responseLength.toLocaleString()}</td>
                                 <td className="p-3.5 max-w-[280px] truncate font-medium text-slate-605">
                                   {log.status === 'success' ? (
                                     <span>Berhasil memproses respons</span>
                                   ) : (
                                     <span className="text-red-650 font-bold" title={log.errorMsg}>{log.errorMsg || 'Terjadi kesalahan tidak dikenal'}</span>
                                   )}
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                 <>
                   {/* Supabase AI Cost & Usage Monitoring View */}
                   {loadingDb ? (
                     <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                       <Loader2 className="animate-spin text-indigo-500" size={32} />
                       <p className="font-semibold text-sm text-slate-500">Menghubungi Supabase & Mengambil Data Biaya...</p>
                     </div>
                   ) : dbLogs.length === 0 ? (
                     <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-250 border-dashed space-y-1">
                       <HelpCircle className="mx-auto text-slate-350 w-8 h-8 mb-2 animate-bounce-soft" />
                       <p className="font-bold text-sm text-slate-500">Belum ada transaksi pemakaian biaya di Supabase</p>
                       <p className="text-xs text-slate-400">Data biaya akan tercatat secara otomatis setelah Anda menggunakan modul AI di aplikasi ini.</p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                       {/* Kurs Info Banner */}
                       <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between text-xs text-indigo-900 font-semibold">
                         <span className="flex items-center gap-2">
                           <Info size={16} className="text-indigo-655 shrink-0" />
                           <span>Kurs Konversi Biaya yang Digunakan: <b>1 USD = Rp 18.200</b>. Estimasi token didasarkan pada formula 1 token ≈ 4 karakter untuk optimasi performa.</span>
                         </span>
                         <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">Rupiah Aktif</span>
                       </div>

                       {/* Bento Grid: Cost & Usage Highlights */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Active Month Bento Card */}
                         <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                           <div>
                             <p className="text-xs uppercase font-black text-indigo-200 tracking-wider">Bulan Aktif</p>
                             <h3 className="text-xl font-black mt-2">{costStats.monthly[0]?.month || 'Belum Ada Transaksi'}</h3>
                           </div>
                           <div className="mt-6">
                             <p className="text-xs text-indigo-200 font-bold flex items-center gap-1.5"><TrendingUp size={12} /> Total Panggilan Bulan Ini</p>
                             <p className="text-3xl font-extrabold mt-1">{(costStats.monthly[0]?.calls || 0).toLocaleString('id-ID')} <span className="text-sm font-normal text-indigo-200">kali</span></p>
                           </div>
                         </div>

                         {/* Total Cost Bento Card */}
                         <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                           <div>
                             <p className="text-xs uppercase font-black text-emerald-100 tracking-wider">Estimasi Biaya Bulan Ini</p>
                             <h3 className="text-xl font-black mt-2">Rp {(costStats.monthly[0]?.idr || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                           </div>
                           <div className="mt-6">
                             <p className="text-xs text-emerald-105 font-bold flex items-center gap-1.5"><DollarSign size={12} /> Setara USD</p>
                             <p className="text-xl font-black mt-1">${(costStats.monthly[0]?.usd || 0).toFixed(4)}</p>
                           </div>
                         </div>

                         {/* Tokens Volume Bento Card */}
                         <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                           <div>
                             <p className="text-xs uppercase font-black text-amber-100 tracking-wider">Volume Token Bulan Ini</p>
                             <h3 className="text-xl font-black mt-2">{(costStats.monthly[0]?.tokens || 0).toLocaleString('id-ID')} <span className="text-xs font-normal">Tokens</span></h3>
                           </div>
                           <div className="mt-6">
                             <p className="text-xs text-amber-100 font-bold flex items-center gap-1.5"><Activity size={12} /> Total Karakter</p>
                             <p className="text-xl font-black mt-1">{(costStats.monthly[0]?.chars || 0).toLocaleString('id-ID')} <span className="text-xs font-normal">Karakter</span></p>
                           </div>
                         </div>
                       </div>

                       {/* API Model Pricing & Usage Breakdown Table */}
                       <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden">
                         <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <Coins className="text-indigo-655 w-5 h-5" />
                             <h3 className="font-extrabold text-slate-800 text-sm">Tarif Resmi & Penggunaan per Model AI</h3>
                           </div>
                           <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Detail Per M Token</span>
                         </div>
                         <div className="overflow-x-auto">
                           <table className="w-full text-xs text-left border-collapse">
                             <thead>
                               <tr className="bg-slate-800 text-white font-bold">
                                 <th className="p-3.5">Model AI</th>
                                 <th className="p-3.5">Provider</th>
                                 <th className="p-3.5 text-right">Tarif Input / M Token</th>
                                 <th className="p-3.5 text-right">Tarif Output / M Token</th>
                                 <th className="p-3.5 text-center">Jumlah Calls</th>
                                 <th className="p-3.5 text-right">Total Tokens</th>
                                 <th className="p-3.5 text-right">Total Biaya (USD)</th>
                                 <th className="p-3.5 text-right text-emerald-450 font-extrabold">Total Biaya (IDR)</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {costStats.models.map((item: any) => (
                                 <tr key={item.model} className="hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                                   <td className="p-3.5 font-bold text-slate-855 font-mono">{item.model}</td>
                                   <td className="p-3.5">
                                     <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black border border-amber-100 bg-amber-50 text-amber-700">
                                       {item.provider.toUpperCase()}
                                     </span>
                                   </td>
                                   <td className="p-3.5 text-right font-medium">
                                     <div className="font-bold text-slate-700">${item.inputRate.toFixed(4)}</div>
                                     <div className="text-[9px] text-slate-400">Rp {(item.inputRate * 18200).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</div>
                                   </td>
                                   <td className="p-3.5 text-right font-medium">
                                     <div className="font-bold text-slate-700">${item.outputRate.toFixed(4)}</div>
                                     <div className="text-[9px] text-slate-400">Rp {(item.outputRate * 18200).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</div>
                                   </td>
                                   <td className="p-3.5 text-center font-bold text-slate-600">{item.calls}</td>
                                   <td className="p-3.5 text-right font-semibold font-mono text-slate-600">{item.tokens.toLocaleString('id-ID')}</td>
                                   <td className="p-3.5 text-right font-bold text-slate-700">${item.usd.toFixed(5)}</td>
                                   <td className="p-3.5 text-right font-black text-emerald-600 font-mono">Rp {item.idr.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>

                       {/* Monthly Breakdown History Table */}
                       <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden">
                         <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center gap-2">
                           <History className="text-indigo-550 w-5 h-5" />
                           <h3 className="font-extrabold text-slate-800 text-sm">Riwayat Penggunaan & Biaya Bulanan</h3>
                         </div>
                         <div className="overflow-x-auto">
                           <table className="w-full text-xs text-left border-collapse">
                             <thead>
                               <tr className="bg-slate-800 text-white font-bold">
                                 <th className="p-3.5">Bulan</th>
                                 <th className="p-3.5 text-center">Total Panggilan</th>
                                 <th className="p-3.5 text-right">Total Karakter</th>
                                 <th className="p-3.5 text-right">Total Token</th>
                                 <th className="p-3.5 text-right">Total Biaya (USD)</th>
                                 <th className="p-3.5 text-right text-emerald-450 font-extrabold">Total Biaya (IDR)</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {costStats.monthly.map((row: any) => (
                                 <tr key={row.month} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                                   <td className="p-3.5 font-bold text-slate-850">{row.month}</td>
                                   <td className="p-3.5 text-center font-bold text-slate-600">{row.calls}</td>
                                   <td className="p-3.5 text-right font-mono text-slate-500">{row.chars.toLocaleString('id-ID')}</td>
                                   <td className="p-3.5 text-right font-mono text-slate-655 font-bold">{row.tokens.toLocaleString('id-ID')}</td>
                                   <td className="p-3.5 text-right font-bold text-slate-700">${row.usd.toFixed(4)}</td>
                                   <td className="p-3.5 text-right font-black text-emerald-600 font-mono">Rp {row.idr.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>

                       {/* Supabase AI Usage Transaction Logs */}
                       <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden">
                         <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <Database className="text-indigo-550 w-5 h-5" />
                             <h3 className="font-extrabold text-slate-800 text-sm">Daftar Log Transaksi AI di Supabase (Terbaru)</h3>
                           </div>
                           <span className="text-[10px] text-slate-400 font-bold font-mono">Supabase Storage Sync</span>
                         </div>
                         <div className="overflow-x-auto">
                           <table className="w-full text-xs text-left border-collapse">
                             <thead>
                               <tr className="bg-slate-800 text-white font-bold">
                                 <th className="p-3.5">Waktu</th>
                                 <th className="p-3.5">Model</th>
                                 <th className="p-3.5 text-right">Prompt Tok. (Chars)</th>
                                 <th className="p-3.5 text-right">Response Tok. (Chars)</th>
                                 <th className="p-3.5 text-right">Biaya (USD)</th>
                                 <th className="p-3.5 text-right text-emerald-450 font-extrabold">Biaya (IDR)</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {dbLogs.slice(0, 30).map((log: any) => (
                                 <tr key={log.id} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                                   <td className="p-3.5 text-slate-550 font-mono">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                   <td className="p-3.5">
                                     <div className="font-bold text-slate-850 font-mono">{log.model}</div>
                                     <div className="text-[9px] text-slate-450 uppercase font-black tracking-wider">{log.provider}</div>
                                   </td>
                                   <td className="p-3.5 text-right font-mono text-slate-650">
                                     <span className="font-bold">{log.prompt_tokens}</span>
                                     <span className="text-[10px] text-slate-400"> ({log.prompt_chars})</span>
                                   </td>
                                   <td className="p-3.5 text-right font-mono text-slate-650">
                                     <span className="font-bold">{log.response_tokens}</span>
                                     <span className="text-[10px] text-slate-400"> ({log.response_chars})</span>
                                   </td>
                                   <td className="p-3.5 text-right font-semibold text-slate-700">${parseFloat(log.cost_usd).toFixed(6)}</td>
                                   <td className="p-3.5 text-right font-black text-emerald-600 font-mono">Rp {parseFloat(log.cost_idr).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     </div>
                   )}
                 </>
               )}
            </div>
          )}

        </div>

      </div>

      {/* MODAL EDIT SOAL (OVERLAY) */}
      {editingQ && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-2xl shadow-lg border border-slate-200 max-w-2xl w-full bg-white overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-650" />
                Edit Butir Soal
              </h3>
              <button 
                onClick={() => setEditingQ(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Pertanyaan</label>
                <textarea 
                  className="w-full glass-input border border-slate-200 rounded-xl p-3 h-36 focus:border-indigo-500 text-sm" 
                  value={editingQ.content} 
                  onChange={(e) => setEditingQ({ ...editingQ, content: e.target.value })} 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Pembahasan / Penjelasan Kunci</label>
                <textarea 
                  className="w-full glass-input border border-slate-200 rounded-xl p-3 h-28 focus:border-indigo-500 text-sm bg-slate-50" 
                  value={editingQ.explanation || ''} 
                  onChange={(e) => setEditingQ({ ...editingQ, explanation: e.target.value })} 
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-150">
                <button 
                  type="button" 
                  onClick={() => setEditingQ(null)} 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800 text-xs font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={savingQuestion}
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  {savingQuestion ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
