// Route a stored 'licenses' attachment value (a full public-style URL or a bare path) through
// the auth-gated /api/file proxy, so the now-private shared-attachments bucket is never served
// publicly (H9). Returns undefined for empty values so `href={fileHref(x)}` stays inert.
export const fileHref = (u?: string | null): string | undefined =>
  u ? `/api/file?p=${encodeURIComponent(u)}` : undefined
