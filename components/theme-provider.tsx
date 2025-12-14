'use client'

// Kita definisikan Interface secara eksplisit agar TypeScript paham
export interface ThemeConfig {
  theme_color: string
}

export default function ThemeProvider({ themeConfig }: { themeConfig: ThemeConfig | null }) {
  if (!themeConfig) return null

  return (
    <style jsx global>{`
      :root {
        /* Kita set variabel CSS global berdasarkan warna dari database */
        --primary: ${themeConfig.theme_color};
      }
    `}</style>
  )
}