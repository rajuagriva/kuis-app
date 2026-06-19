'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'

// Daftar model Gemini yang dicoba berurutan dari yang paling cerdas & hemat
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.0-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
]

// Tarif per 1.000.000 tokens (dalam USD)
const pricing: Record<string, { input: number; output: number }> = {
  'gemini-3.5-flash': { input: 1.50, output: 9.00 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.50 },
  'gemini-3.0-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 }
}

// Log Penggunaan AI ke Supabase
export async function logAiUsage({
  model,
  provider,
  promptChars,
  responseChars
}: {
  model: string
  provider: string
  promptChars: number
  responseChars: number
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Estimasi tokens: 1 token ≈ 4 karakter
    const promptTokens = Math.ceil(promptChars / 4)
    const responseTokens = Math.ceil(responseChars / 4)
    
    const rates = pricing[model] || { input: 0.075, output: 0.30 }
    const costUsd = ((promptTokens * rates.input) + (responseTokens * rates.output)) / 1000000
    const costIdr = costUsd * 18200 // Kurs 1 USD = Rp 18.200
    
    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: user?.id || null,
      model,
      provider,
      prompt_tokens: promptTokens,
      response_tokens: responseTokens,
      prompt_chars: promptChars,
      response_chars: responseChars,
      cost_usd: costUsd,
      cost_idr: costIdr,
      input_cost_per_m: rates.input,
      output_cost_per_m: rates.output
    })

    if (error) {
      console.error('Database error logging AI usage:', error)
    }
  } catch (err) {
    console.error('Failed to log AI usage to Supabase:', err)
  }
}

// Mendapatkan koleksi API Key Gemini dari Environment Variables
function getGeminiApiKeys(): string[] {
  const keys: string[] = []
  
  // Ambil GEMINI_API_KEY_1 sampai GEMINI_API_KEY_4
  for (let i = 1; i <= 4; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`]
    if (key && key.trim()) {
      keys.push(key.trim())
    }
  }
  
  // Fallback ke GEMINI_API_KEY tunggal jika key bernomor tidak diset
  if (keys.length === 0) {
    const defaultKey = process.env.GEMINI_API_KEY
    if (defaultKey && defaultKey.trim()) {
      keys.push(defaultKey.trim())
    }
  }
  
  return keys
}

// Router AI dengan strategi Multi-Key dan Multi-Model Fallback
async function callGeminiWithFallback(
  prompt: string,
  systemInstruction?: string,
  jsonMode: boolean = false,
  clientKeys?: string[]
): Promise<{ responseText: string; modelUsed: string }> {
  // Gunakan API Key yang dikirim dari client (localStorage) jika ada, jika tidak fallback ke env vars
  const keys = (clientKeys && clientKeys.length > 0) ? clientKeys : getGeminiApiKeys()
  
  if (keys.length === 0) {
    throw new Error('Server Error: API Key Gemini belum disetting di environment (GEMINI_API_KEY_1 s.d 4 atau GEMINI_API_KEY) dan tidak ada key di localStorage.')
  }

  let lastError: any = null

  // 1. Iterasi API Key
  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const apiKey = keys[keyIdx]

    // 2. Iterasi Model untuk Key yang sama sebelum berpindah Key
    for (let modelIdx = 0; modelIdx < GEMINI_MODELS.length; modelIdx++) {
      const modelName = GEMINI_MODELS[modelIdx]
      console.log(`[Smart AI Router] Mencoba Key-${keyIdx + 1} dengan Model: ${modelName}`)

      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const modelInstance = genAI.getGenerativeModel({
          model: modelName,
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(jsonMode ? {
            generationConfig: {
              responseMimeType: 'application/json'
            }
          } : {})
        })

        const result = await modelInstance.generateContent(prompt)
        const responseText = result.response.text()

        if (responseText && responseText.trim()) {
          console.log(`[Smart AI Router] Sukses! Menggunakan Key-${keyIdx + 1} dan Model: ${modelName}`)
          
          // Log ke database Supabase
          logAiUsage({
            model: modelName,
            provider: 'gemini',
            promptChars: prompt.length + (systemInstruction?.length || 0),
            responseChars: responseText.trim().length
          }).catch(err => console.error('Error logging usage async:', err))

          return { responseText: responseText.trim(), modelUsed: modelName }
        }
      } catch (err: any) {
        console.warn(`[Smart AI Router] Key-${keyIdx + 1} Gagal dengan Model ${modelName}:`, err.message || err)
        lastError = err

        const errMsg = (err.message || '').toLowerCase()
        // Cek jika error adalah invalid key / unauthorized / 401 / 403
        const isAuthError = 
          errMsg.includes('api key not valid') || 
          errMsg.includes('401') || 
          errMsg.includes('403') || 
          errMsg.includes('unauthorized') || 
          errMsg.includes('invalid api key') ||
          errMsg.includes('invalid_key')

        if (isAuthError) {
          console.warn(`[Smart AI Router] Key-${keyIdx + 1} tidak valid. Langsung beralih ke Key berikutnya...`)
          break // Skip sisa model untuk Key ini, langsung lanjut ke Key berikutnya
        }
        // Jika error kuota/rate limit biasa (429), lanjutkan mencoba model lain pada Key yang sama
      }
    }
  }

  // Jika semua kombinasi Key dan Model gagal
  throw new Error(`Seluruh kombinasi API Key dan Model Gemini gagal digunakan. (Detail error terakhir: ${lastError?.message || lastError})`)
}

// Penjelasan Soal Pilihan Ganda (Study Mode)
export async function askAIExplanation(
  questionText: string,
  options: any[],
  correctAnswerText: string,
  userAnswerText?: string,
  clientKeys?: string[]
) {
  const optionsText = options.map((o: any) => `- ${o.text}`).join('\n')
  
  const systemInstruction = "Kamu adalah Guru Privat IT yang ramah. Jelaskan dalam Bahasa Indonesia. Gunakan format Markdown (Bold/Code). Penjelasan maksimal 6 kalimat saja biar singkat. Analisis secara kritis jawaban yang dipilih oleh user dibandingkan dengan kunci jawaban."
  
  let prompt = `SOAL: "${questionText}"\n\nPILIHAN:\n${optionsText}\n\nJAWABAN BENAR: "${correctAnswerText}"\n\n`
  if (userAnswerText && userAnswerText.trim()) {
    prompt += `JAWABAN YANG DIPILIH USER: "${userAnswerText}"\n\nJelaskan secara spesifik apakah jawaban yang dipilih user tersebut BENAR atau SALAH. Berikan analisis ringkas kenapa pilihan user tersebut benar/salah, dan jelaskan kenapa kunci jawaban yang benar adalah "${correctAnswerText}".`
  } else {
    prompt += `Jelaskan kenapa kunci jawaban "${correctAnswerText}" itu benar dan kenapa pilihan lainnya salah.`
  }

  try {
    const { responseText, modelUsed } = await callGeminiWithFallback(prompt, systemInstruction, false, clientKeys)
    return { success: true, explanation: responseText, modelUsed }
  } catch (error: any) {
    console.error('🔥 Gemini askAIExplanation Error:', error)
    return { error: error.message || 'Gagal menghubungi server AI.' }
  }
}

// Penilaian Essay Mandiri oleh AI
export async function gradeEssay(questionText: string, expectedExplanation: string, studentAnswer: string, clientKeys?: string[]) {
  const systemInstruction = `Kamu adalah Asisten Dosen IT yang bertugas menilai jawaban essay mahasiswa secara adil dan objektif.
Berikan penilaian dalam Bahasa Indonesia.
PENTING:
- Evaluasi JAWABAN MAHASISWA secara kritis berdasarkan PEMBAHASAN ACUAN.
- Jangan tertukar antara JAWABAN MAHASISWA dan PEMBAHASAN ACUAN.
- Jika JAWABAN MAHASISWA kosong, tidak menjawab, hanya kata-kata acak, atau tidak ada hubungannya dengan soal, berikan nilai rendah atau 0.
- Berikan umpan balik yang menjelaskan bagian mana dari jawaban mahasiswa yang sudah benar atau masih salah.
Format output HARUS selalu berupa JSON valid dengan struktur:
{
  "score": <angka_0_sampai_100>,
  "feedback": "<umpan_balik_konstruktif_dalam_bahasa_indonesia_maksimal_3_kalimat>"
}`

  const prompt = `SOAL: "${questionText}"
PEMBAHASAN ACUAN: "${expectedExplanation}"
JAWABAN MAHASISWA: "${studentAnswer}"

Berikan nilai antara 0-100 berdasarkan kesesuaian dengan pembahasan acuan, serta berikan umpan balik yang membangun.`

  try {
    const { responseText, modelUsed } = await callGeminiWithFallback(prompt, systemInstruction, true, clientKeys)
    const parsed = JSON.parse(responseText)
    return { success: true, score: Number(parsed.score), feedback: parsed.feedback, modelUsed }
  } catch (error: any) {
    console.error('🔥 Gemini gradeEssay Error:', error)
    return { error: error.message || 'Gagal menilai dengan AI.' }
  }
}