// A business-rule refusal from the database (an Arabic `raise exception` such as the pricing-agent
// cap, the source-shop rule or «وثّق رقم جوالك») is shown to the user as it is; anything else
// (network, technical errors) gets the page's own friendly fallback.
export function dbMessage(error: any, fallback: string): string {
  const m = String(error?.message || '')
  return /[؀-ۿ]/.test(m) && m.length < 300 ? m : fallback
}
