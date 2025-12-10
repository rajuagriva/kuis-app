import type { Metadata } from "next";
import "./globals.css"; 
import ThemeProvider from "@/components/theme-provider";
import Navbar from "@/components/navbar"; 
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Kuis App",
  description: "Aplikasi Ujian Online",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  
  // --- PERBAIKAN LOGIKA TEMA ---
  // Jangan ambil tema user yang login, tapi ambil tema milik ADMIN.
  // Kita cari profil pertama yang role-nya 'admin'.
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('theme_config')
    .eq('role', 'admin')
    .limit(1) // Ambil satu admin saja sebagai patokan
    .single()

  // Gunakan config dari admin tersebut untuk seluruh aplikasi
  const themeConfig = adminProfile?.theme_config || null
  // -----------------------------

  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">
        {/* Inject Warna Tema Global (Milik Admin) */}
        <ThemeProvider themeConfig={themeConfig} />
        
        {/* Navbar */}
        <Navbar /> 
        
        {/* Konten Halaman */}
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </body>
    </html>
  );
}