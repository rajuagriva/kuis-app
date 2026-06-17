import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createQuizSession } from '../actions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 1. Verifikasi User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Parse Query Params
  const { searchParams } = request.nextUrl
  const mode = (searchParams.get('mode') || 'study') as 'practice' | 'exam' | 'study' | 'essay'
  const subjectId = searchParams.get('subjectId') || undefined
  const modulesParam = searchParams.get('modules') || undefined
  const countParam = searchParams.get('count') || '10'
  const count = parseInt(countParam, 10) || 10

  // 3. Konfigurasi Module IDs
  let moduleIds: string[] | undefined = undefined
  if (modulesParam) {
    moduleIds = modulesParam.split(',').filter(m => m.trim().length > 0)
  }

  // 4. Buat Sesi Kuis
  try {
    const result = await createQuizSession(mode, {
      subjectId,
      moduleIds,
      count
    })

    if (result.error) {
      console.error("🔥 Error creating session in start-custom route:", result.error)
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent(result.error)}`, request.url)
      )
    }

    if (result.sessionId) {
      // Jika mode essay, arahkan ke rute essay khusus. Jika tidak, ke rute kuis biasa
      const redirectPath = mode === 'essay' 
        ? `/quiz/essay/${result.sessionId}` 
        : `/quiz/${result.sessionId}`
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  } catch (error: any) {
    console.error("🔥 Server Exception in start-custom route:", error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error.message || 'Server Exception')}`, request.url)
    )
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
