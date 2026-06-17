'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetDate: string // Format: 'YYYY-MM-DDT[HH:MM:SS]'
  title: string
  color: 'violet' | 'emerald'
}

export default function CountdownTimer({ targetDate, title, color }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date()
      let timeLeftData = { days: 0, hours: 0, minutes: 0, seconds: 0 }

      if (difference > 0) {
        timeLeftData = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }
      return timeLeftData
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (!isClient) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-slate-800 text-center flex-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</h4>
        <div className="text-2xl font-black text-slate-500">Loading...</div>
      </div>
    )
  }

  const borderClass = color === 'violet' ? 'hover:border-violet-500/50 glow-violet' : 'hover:border-emerald-500/50 glow-emerald'
  const accentTextClass = color === 'violet' ? 'text-violet-400' : 'text-emerald-400'
  const badgeBg = color === 'violet' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

  return (
    <div className={`glass-card rounded-2xl p-6 border border-slate-800/80 transition-all duration-300 flex-1 relative overflow-hidden group ${borderClass}`}>
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 rounded-full blur-2xl opacity-10 bg-current"></div>
      
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
          {timeLeft.days > 0 ? `${timeLeft.days} hari lagi` : 'Hari H!'}
        </span>
      </div>

      <div className="flex justify-center items-center gap-3">
        <TimeSegment value={timeLeft.days} label="Hari" colorClass={accentTextClass} />
        <TimeDivider />
        <TimeSegment value={timeLeft.hours} label="Jam" colorClass={accentTextClass} />
        <TimeDivider />
        <TimeSegment value={timeLeft.minutes} label="Menit" colorClass={accentTextClass} />
        <TimeDivider />
        <TimeSegment value={timeLeft.seconds} label="Detik" colorClass={accentTextClass} />
      </div>
    </div>
  )
}

function TimeSegment({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="text-center min-w-[50px]">
      <span className={`block text-3xl font-black tracking-tight ${colorClass}`}>
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">
        {label}
      </span>
    </div>
  )
}

function TimeDivider() {
  return <span className="text-xl font-bold text-slate-700 mb-4 animate-pulse">:</span>
}
