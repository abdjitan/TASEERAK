// GET /api/admin/ai-health — admin only: is each AI provider answering? (no keys in the response)
import { NextResponse } from 'next/server'
import { getRouteUser, isAdminSession } from '@/lib/supabase/server'
import { aiHealth } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, user } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!(await isAdminSession(supabase))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json(await aiHealth())
}
