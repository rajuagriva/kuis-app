/**
 * Utility to retrieve Gemini API Keys from browser's localStorage.
 * Reads cfg_gemini_key_1 through cfg_gemini_key_4.
 * Falls back to cfg_gemini_key if no numbered keys are found.
 */
export function getClientGeminiKeys(): string[] {
  if (typeof window === 'undefined') return []
  
  const keys: string[] = []
  for (let i = 1; i <= 4; i++) {
    const key = localStorage.getItem(`cfg_gemini_key_${i}`)
    if (key && key.trim()) {
      keys.push(key.trim())
    }
  }
  
  // Fallback to legacy single key
  if (keys.length === 0) {
    const oldKey = localStorage.getItem('cfg_gemini_key')
    if (oldKey && oldKey.trim()) {
      keys.push(oldKey.trim())
    }
  }
  
  return keys
}

// Pricing per 1.000.000 tokens (dalam USD)
export const pricing: Record<string, { input: number; output: number }> = {
  'gemini-3.5-flash': { input: 1.50, output: 9.00 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.50 },
  'gemini-3.0-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 }
}

const DEFAULT_REGISTRY: Record<string, any> = {
  "gemini-3.5-flash": {
    provider: 'gemini',
    name: 'Gemini 3.5 Flash',
    remainingRequests: 15,
    maxRequests: 15,
    remainingTokens: 30000,
    maxTokens: 30000,
    resetRequestsTime: 0,
    resetTokensTime: 0,
    isLimited: false,
    history: []
  },
  "gemini-3.1-flash-lite": {
    provider: 'gemini',
    name: 'Gemini 3.1 Flash Lite',
    remainingRequests: 15,
    maxRequests: 15,
    remainingTokens: 30000,
    maxTokens: 30000,
    resetRequestsTime: 0,
    resetTokensTime: 0,
    isLimited: false,
    history: []
  },
  "gemini-3.0-flash-preview": {
    provider: 'gemini',
    name: 'Gemini 3.0 Flash Preview',
    remainingRequests: 15,
    maxRequests: 15,
    remainingTokens: 30000,
    maxTokens: 30000,
    resetRequestsTime: 0,
    resetTokensTime: 0,
    isLimited: false,
    history: []
  },
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
    history: []
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
    history: []
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
    history: []
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
    history: []
  }
}

export function getRateLimitRegistry(): Record<string, any> {
  if (typeof window === 'undefined') return DEFAULT_REGISTRY

  const stored = localStorage.getItem('cfg_ai_rate_limit_registry')
  let registry: Record<string, any> = DEFAULT_REGISTRY

  if (stored) {
    try {
      registry = JSON.parse(stored)
    } catch (e) {
      registry = DEFAULT_REGISTRY
    }
  }

  // Ensure all current default models exist
  let modified = false
  for (const modelKey of Object.keys(DEFAULT_REGISTRY)) {
    if (!registry[modelKey]) {
      registry[modelKey] = { ...DEFAULT_REGISTRY[modelKey] }
      modified = true
    }
  }

  // Auto-recovery / ticking limits based on timestamp
  const now = Date.now()
  for (const modelKey of Object.keys(registry)) {
    const entry = registry[modelKey]
    
    // Recovery for blocked state
    if (entry.isLimited && entry.resetRequestsTime > 0 && now >= entry.resetRequestsTime) {
      entry.remainingRequests = entry.maxRequests
      entry.remainingTokens = entry.maxTokens
      entry.resetRequestsTime = 0
      entry.resetTokensTime = 0
      entry.isLimited = false
      modified = true
    }
  }

  if (modified) {
    localStorage.setItem('cfg_ai_rate_limit_registry', JSON.stringify(registry))
  }

  return registry
}

export function saveRateLimitRegistry(registry: Record<string, any>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('cfg_ai_rate_limit_registry', JSON.stringify(registry))
}

export function addHistoryLog(
  modelKey: string,
  status: 'success' | 'failed',
  promptLength: number,
  responseLength: number,
  errorMsg?: string
) {
  if (typeof window === 'undefined') return

  const registry = getRateLimitRegistry()
  const entry = registry[modelKey]

  if (!entry) return

  // Deduct requests and tokens
  if (status === 'success') {
    entry.remainingRequests = Math.max(0, entry.remainingRequests - 1)
    const tokensUsed = Math.ceil(promptLength / 4) + Math.ceil(responseLength / 4)
    entry.remainingTokens = Math.max(0, entry.remainingTokens - tokensUsed)

    if (entry.remainingRequests === 0 || entry.remainingTokens === 0) {
      entry.isLimited = true
      entry.resetRequestsTime = Date.now() + 60000 // Block for 60s
      entry.resetTokensTime = Date.now() + 60000
    }
  } else {
    // If it failed (like rate limited or 429), mark it as limited
    entry.isLimited = true
    entry.resetRequestsTime = Date.now() + 60000 // Block for 60s
    entry.resetTokensTime = Date.now() + 60000
    entry.remainingRequests = 0
    entry.remainingTokens = 0
  }

  // Add history log
  if (!entry.history) entry.history = []
  entry.history.unshift({
    timestamp: Date.now(),
    status,
    promptLength,
    responseLength,
    errorMsg
  })

  // Limit history to last 50 entries
  if (entry.history.length > 50) {
    entry.history = entry.history.slice(0, 50)
  }

  saveRateLimitRegistry(registry)

  // Dispatch custom event
  window.dispatchEvent(new Event('ai-rate-limits-updated'))
}
