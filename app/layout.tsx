import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/theme-provider"; // Pastikan import ini jalan
import Navbar from "@/components/navbar"; 
import { createClient } from "@/utils/supabase/server";
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: "Aplikasi Kuis Pintar",
  description: "Platform belajar dengan sistem analisis cerdas",
};

// Fungsi ambil data tema
async function getThemeConfig() {
  const supabase = await createClient()
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('theme_color') // Ambil kolom theme_color
      .single()
    
    // PENTING: Return object harus persis { theme_color: string }
    return { theme_color: data?.theme_color || '#4f46e5' }
  } catch (error) {
    return { theme_color: '#4f46e5' }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeConfig = await getThemeConfig()

  return (
    <html lang="en">
      {/* Suppress Hydration Warning untuk mencegah error ekstensi browser */}
      <body 
        className="antialiased bg-gray-50 text-gray-900 font-sans"
        suppressHydrationWarning={true} 
      >
        <ThemeProvider themeConfig={themeConfig} />
        
        <Navbar />
        
        <main className="min-h-screen pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}