// Suggestion types and statuses (migration 169), shared by the user page and the admin page.
export const SUGGESTION_KINDS = [
  { k: 'feature', ar: 'ميزة جديدة', en: 'New feature', ur: 'نئی سہولت' },
  { k: 'material', ar: 'مادة ناقصة', en: 'Missing material', ur: 'غائب مواد' },
  { k: 'problem', ar: 'مشكلة', en: 'A problem', ur: 'مسئلہ' },
  { k: 'other', ar: 'غير ذلك', en: 'Other', ur: 'دیگر' },
] as const
export const SUGGESTION_STATUS: Record<string, { ar: string; en: string; ur: string; tone: string }> = {
  new: { ar: 'جديد', en: 'New', ur: 'نیا', tone: '#6b7280' },
  planned: { ar: 'قيد التنفيذ', en: 'Planned', ur: 'زیرِ عمل', tone: '#9D7425' },
  done: { ar: 'تمّ', en: 'Done', ur: 'مکمل', tone: '#0F6E56' },
  declined: { ar: 'لن يُنفّذ حالياً', en: 'Not now', ur: 'فی الحال نہیں', tone: '#b42318' },
}
