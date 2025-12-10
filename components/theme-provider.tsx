'use client'

import { useEffect } from 'react'

interface ThemeConfig {
  color?: string
  radius?: number
}

// Fungsi helper untuk menggelapkan warna (untuk efek hover)
function adjustBrightness(hex: string, percent: number) {
    if(!hex) return '#3b82f6'; // Default blue
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.round(r * (1 + percent / 100));
    g = Math.round(g * (1 + percent / 100));
    b = Math.round(b * (1 + percent / 100));

    r = (r < 255) ? r : 255;  
    g = (g < 255) ? g : 255;  
    b = (b < 255) ? b : 255;  

    const RR = ((r.toString(16).length === 1) ? "0" + r.toString(16) : r.toString(16));
    const GG = ((g.toString(16).length === 1) ? "0" + g.toString(16) : g.toString(16));
    const BB = ((b.toString(16).length === 1) ? "0" + b.toString(16) : b.toString(16));

    return "#" + RR + GG + BB;
}

export default function ThemeProvider({ 
  themeConfig 
}: { 
  themeConfig: ThemeConfig | null 
}) {
  useEffect(() => {
    const root = document.documentElement
    
    // Default Values
    const primary = themeConfig?.color || '#4f46e5' // Indigo default
    const radius = themeConfig?.radius !== undefined ? themeConfig.radius : 8

    // Set CSS Variables
    root.style.setProperty('--color-primary', primary)
    root.style.setProperty('--color-primary-hover', adjustBrightness(primary, -15)) // 15% lebih gelap
    root.style.setProperty('--radius', `${radius}px`)
    
  }, [themeConfig])

  return null // Komponen ini tidak merender UI apa-apa, hanya logic styling
}