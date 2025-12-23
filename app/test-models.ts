// Fungsi Debugging Sementara
export async function checkAvailableModels() {
  const apiKey = process.env.GOOGLE_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  
  try {
    const res = await fetch(url)
    const data = await res.json()
    console.log("📋 DAFTAR MODEL YANG TERSEDIA UTK KEY INI:")
    console.log(JSON.stringify(data, null, 2))
    return data
  } catch (e) {
    console.error(e)
  }
}