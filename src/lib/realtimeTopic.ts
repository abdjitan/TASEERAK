// supabase-js returns the EXISTING channel when a topic name is reused. If a component mounts twice
// (React StrictMode, a page change that remounts AppShell before removeChannel finishes, or two
// components using the same hook), the second mount adds .on() to an already-subscribed channel and
// throws «cannot add postgres_changes callbacks … after subscribe()». A unique suffix per
// subscription avoids it; the postgres_changes filter (not the topic) decides what is received.
export function realtimeTopic(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 10)}`
}
