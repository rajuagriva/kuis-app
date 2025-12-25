'use server'

export async function askAIExplanation(questionText: string, options: any[], correctAnswerText: string) {
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    return { error: 'Server Error: GROQ_API_KEY belum disetting.' }
  }

  const optionsText = options.map((o: any) => `- ${o.text}`).join('\n')
  
  const messages = [
    {
      role: "system",
      content: "Kamu adalah Guru Privat IT yang ramah. Jelaskan dalam Bahasa Indonesia. Gunakan format Markdown (Bold/Code). Penjelasan maksimal 6 kalimat saja biar singkat."
    },
    {
      role: "user",
      content: `SOAL: "${questionText}"\n\nPILIHAN:\n${optionsText}\n\nJAWABAN BENAR: "${correctAnswerText}"\n\nJelaskan kenapa jawaban itu benar dan kenapa yang lain salah.`
    }
  ]

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // Model ini sangat cerdas, cepat, dan GRATIS.
        model: "openai/gpt-oss-120b", 
        messages: messages,
        temperature: 0.7,
        max_tokens: 600
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("🔥 Groq Error:", errorData)
      return { error: `Gagal: ${errorData.error?.message || 'Terjadi kesalahan'}` }
    }

    const data = await response.json()
    const explanation = data.choices[0]?.message?.content

    if (!explanation) return { error: 'AI diam saja.' }

    return { success: true, explanation }

  } catch (error: any) {
    console.error('🔥 Fetch Error:', error)
    return { error: 'Gagal menghubungi server Groq.' }
  }
}

// Fungsi sisa dihapus
export async function checkAvailableModels() {}