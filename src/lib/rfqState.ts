// ════════════════════════════════════════════════════════════════
// One shared reading of a buyer's request state (round-2 UX-003 / UX-048).
// Every buyer screen (home, «طلباتي», the request page, the app cards) should
// use these so the same request never shows «انتهت المهلة» and
// «بانتظار العروض» at once, and an OPEN request whose pricing window ended
// WITH offers reads «اختر عرضاً», never as a dead request.
// The status label itself lives in rfqStatusLabel() (src/lib/dealStage.ts).
// ════════════════════════════════════════════════════════════════
import { isExpired } from './deadline'
import { rfqStatusLabel as dealRfqStatusLabel } from './dealStage'

export type RfqState =
  | 'awaiting'        // open, window running, no offers yet
  | 'offers'          // open, window running, offers arrived
  | 'offers_expired'  // open, window ended with offers: the buyer must choose
  | 'expired_empty'   // window ended with no offers, or the request ended (status 'expired': offers can no longer be chosen)
  | 'cancelled'
  | 'closed'          // an offer was chosen (deal running or done)

export function rfqState(rfq: any): RfqState {
  const status = rfq?.status
  if (status === 'cancelled') return 'cancelled'
  if (status === 'closed' || status === 'awarded') return 'closed'
  // expire_stale_rfqs sets 'expired' 30 days after the deadline: nothing can be chosen any more
  if (status !== 'open') return 'expired_empty'
  const offers = Number(rfq?.offer_count) || 0
  if (isExpired(rfq?.expires_at)) return offers > 0 ? 'offers_expired' : 'expired_empty'
  return offers > 0 ? 'offers' : 'awaiting'
}

// the request still waits for the buyer to choose (open with offers, or open past the deadline with offers)
export const needsChoice = (s: RfqState) => s === 'offers' || s === 'offers_expired'

/** The one status label for a request, via the shared rfqStatusLabel in dealStage.ts. */
export function rfqStatusLabel(rfq: any, locale: string, opts: { dealDone?: boolean } = {}): string {
  return dealRfqStatusLabel(rfq, {
    dealStarted: rfq?.status === 'closed' || rfq?.status === 'awarded',
    dealComplete: !!opts.dealDone,
    hasOffers: (Number(rfq?.offer_count) || 0) > 0,
    expired: isExpired(rfq?.expires_at),
  }, locale).label
}

/** Brand colours per state: gold = needs the buyer, navy = running, green = done, neutral = ended. Never red. */
export function rfqStateTone(s: RfqState, dealDone = false): { bg: string; fg: string } {
  switch (s) {
    case 'offers':
    case 'offers_expired': return { bg: '#D4A543', fg: '#071827' }
    case 'awaiting': return { bg: '#0B2438' + '12', fg: '#0B2438' }
    case 'closed': return dealDone ? { bg: '#0F6E56' + '18', fg: '#0F6E56' } : { bg: '#0B2438' + '12', fg: '#0B2438' }
    default: return { bg: '#F1F3F5', fg: '#48596E' }
  }
}
