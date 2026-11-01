// The admin AI lab (/admin/ai-lab) calls the same routes the app uses with the header
// «x-ai-lab: 1»; for an admin the route then adds a `lab` block (AI calls made, provider, time,
// rule-based vs AI path). Everyone else gets the normal answer, without internals.
import type { NextRequest } from 'next/server'

export async function labMode(req: NextRequest, supabase: any, user: any): Promise<boolean> {
  if (req.headers.get('x-ai-lab') !== '1' || !user?.id) return false
  try {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
  } catch { return false }
}
