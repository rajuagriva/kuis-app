'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

// Inisialisasi Client Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function askAIExplanation(questionText: string, options: any[], correctAnswerText: string) {
  try {
    // 1. Validasi Input
    if (!questionText || !correctAnswerText) {
      return { error: 'Data soal tidak lengkap.' }
    }

    // 2. Pilih Model (gemini-1.5-flash lebih cepat & hemat, gemini-pro lebih pintar)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // 3. Susun Prompt
    const optionsText = options.map((o: any) => `- ${o.text}`).join('\n')

    const prompt = `
      Bertindaklah sebagai Guru Privat/Dosen IT yang ramah dan pintar.
      
      SOAL:
      "${questionText}"

      PILIHAN JAWABAN:
      ${optionsText}

      JAWABAN YANG BENAR:
      "${correctAnswerText}"

      TUGAS:
      1. Jelaskan secara singkat dan padat (maksimal 2 kalimat) MENGAPA jawaban tersebut benar.
      2. Jelaskan juga kenapa pilihan lain salah (jika relevan).
      3. Jika soal berupa kodingan (C++, Java, Python, dll), jelaskan logika baris per barisnya atau konsep Big-Oh nya.
      4. Gunakan format Markdown (bold, code block) agar enak dibaca.
    `

    // 4. Kirim ke Google Gemini
    const result = await model.generateContent(prompt)
    const response = await result.response
    const explanation = response.text()

    return { success: true, explanation }

  } catch (error) {
    console.error('Google AI Error:', error)
    return { error: 'Maaf, AI sedang istirahat. Coba lagi nanti.' }
  }
}