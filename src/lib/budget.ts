// R23 (owner 2026-11-12): optional buyer budget per unit for each RFQ item, stored BEFORE VAT
// (the buyer types and sees it VAT-inclusive: budgetToStored / budgetShown).
// Stored in rfq_item_budgets (never inside rfqs.items: suppliers can read that row).
// Hidden from suppliers unless the buyer ticks «أظهرها للموردين».
import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemBudget = { item_index: number; budget_unit_price: number; budget_visible?: boolean }

/** Parse a typed budget ("150", "١٥٠", "80.5") → a positive number or null. */
export function parseBudget(v: string | number | null | undefined): number | null {
  if (v == null) return null
  const s = String(v).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[,،\s]/g, '').replace('٫', '.')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

/** Save the budgets of one RFQ (replace-all). Non-fatal: returns false on failure. */
export async function saveRfqBudgets(supabase: SupabaseClient, rfqId: string, budgets: ItemBudget[]): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('set_rfq_item_budgets', { p_rfq_id: rfqId, p_budgets: budgets })
    return !error
  } catch { return false }
}

/** Buyer: all budgets of an RFQ (RLS = owner only) → map item_index → row. */
export async function loadOwnerBudgets(supabase: SupabaseClient, rfqId: string): Promise<Record<number, ItemBudget>> {
  try {
    const { data } = await supabase.from('rfq_item_budgets').select('item_index,budget_unit_price,budget_visible').eq('rfq_id', rfqId)
    const out: Record<number, ItemBudget> = {}
    for (const r of (data || []) as any[]) out[r.item_index] = { item_index: r.item_index, budget_unit_price: Number(r.budget_unit_price), budget_visible: !!r.budget_visible }
    return out
  } catch { return {} }
}

/** Supplier: only the budgets the buyer chose to show → map item_index → unit price. */
export async function loadVisibleBudgets(supabase: SupabaseClient, rfqId: string): Promise<Record<number, number>> {
  try {
    const { data } = await supabase.rpc('get_rfq_visible_budgets', { p_rfq_id: rfqId })
    const out: Record<number, number> = {}
    for (const r of (data || []) as any[]) out[r.item_index] = Number(r.budget_unit_price)
    return out
  } catch { return {} }
}

/** Unit price before VAT, comparable with the budget. A seller without a VAT number adds no VAT,
 *  so their price is taken as-is; otherwise vat_included prices are divided by 1.15. */
export function preVatUnit(price: number, offer: any): number {
  if (offer?.vat_status === 'not_registered') return price
  return offer?.vat_included ? price / 1.15 : price
}

// Owner 2026-11-23: every buyer types and sees the budget VAT-inclusive («أقصى مبلغ للوحدة شامل
// الضريبة»). The table keeps it BEFORE VAT (suppliers read it that way), so convert at the edges.
/** A typed VAT-inclusive budget → the stored before-VAT value (2 decimals). */
export function budgetToStored(typedIncl: number | null): number | null {
  return typedIncl == null ? null : Math.round((typedIncl / 1.15) * 100) / 100
}
/** A stored before-VAT budget → what the buyer sees (VAT-inclusive). Snaps to a whole riyal when the
 *  2-decimal storage only blurred a typed whole number (150 → 130.43 → 150, not 149.99). */
export function budgetShown(stored: number): number {
  const x = (Number(stored) || 0) * 1.15
  const r = Math.round(x)
  return Math.abs(x - r) < 0.01 ? r : Math.round(x * 100) / 100
}

/** How far over the budget (SAR, on the basis of both arguments), or 0 when within it. */
export function overBudget(unitPreVat: number, budget: number, qty = 1): number {
  const d = (unitPreVat - budget) * (qty || 1)
  return d > 0.005 ? Math.round(d * 100) / 100 : 0
}
