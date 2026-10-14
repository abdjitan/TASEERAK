// Inline line icons that replace the old emoji (design language: one stroke icon set, no emoji).
// Sized 1em so it follows the surrounding text size (text-5xl empty-state tiles stay big).
import {
  Building2, MapPin, Phone, Trash2, Clock, User, Users, Search, TrendingUp, BarChart3, Trophy, Package, Sparkles,
  ReceiptText, Bell, Lock, AlertTriangle, XCircle, CheckCircle2, ClipboardList, Upload, Target, Hourglass, Star,
  Hand, Inbox, Circle, Tag, CalendarDays, Settings2, MessageCircle, AlarmClock, Ban, Zap, Paperclip, Camera,
  ShieldCheck, TrendingDown, HelpCircle, FileText, PenLine, HardHat, Truck, Home, CreditCard, Lightbulb,
  Menu, Scale, Globe, Sprout, Medal, Factory, Eye, Wallet, Ruler, Files, Mail, Mailbox, Repeat, KeyRound, Feather,
  Printer, FolderOpen, Map, Flag, Footprints, Bot, Handshake, Brain, Puzzle, BrickWall, Landmark, Tractor, Store,
} from 'lucide-react'

const MAP: Record<string, [any, string?]> = {
  '🏢': [Building2], '📍': [MapPin], '📞': [Phone], '🗑': [Trash2], '🕐': [Clock], '👤': [User], '👥': [Users],
  '🔍': [Search], '📈': [TrendingUp], '📊': [BarChart3], '🏆': [Trophy, 'text-[#D4A543]'], '📦': [Package],
  '🎉': [Sparkles, 'text-[#D4A543]'], '🧾': [ReceiptText], '🔔': [Bell], '🔒': [Lock], '⚠': [AlertTriangle, 'text-amber-600'],
  '❌': [XCircle, 'text-red-500'], '✅': [CheckCircle2, 'text-emerald-600'], '📋': [ClipboardList], '📤': [Upload],
  '🎯': [Target], '⏳': [Hourglass, 'text-amber-600'], '⭐': [Star, 'text-[#D4A543]'], '👋': [Hand, 'text-[#D4A543]'],
  '📭': [Inbox], '🟢': [Circle, 'text-emerald-500 fill-emerald-500'], '🔴': [Circle, 'text-red-500 fill-red-500'],
  '🟠': [Circle, 'text-orange-500 fill-orange-500'], '⏰': [AlarmClock], '🗓': [CalendarDays], '📅': [CalendarDays],
  '⚙': [Settings2], '💬': [MessageCircle], '🚫': [Ban, 'text-red-500'], '⚡': [Zap], '📎': [Paperclip], '📷': [Camera],
  '🛡': [ShieldCheck], '📉': [TrendingDown], '❓': [HelpCircle], '📄': [FileText], '📝': [PenLine], '🏗': [HardHat],
  '🚚': [Truck], '🏘': [Home], '💳': [CreditCard], '💡': [Lightbulb, 'text-[#D4A543]'], '🎁': [Sparkles], '🏷': [Tag],
  '☰': [Menu], '⚖': [Scale], '⛔': [Ban, 'text-red-500'], '🌐': [Globe], '🌱': [Sprout, 'text-emerald-600'], '🏅': [Medal, 'text-[#D4A543]'],
  '🏭': [Factory], '👁': [Eye], '👷': [HardHat], '💰': [Wallet], '📏': [Ruler], '📑': [Files], '📨': [Mail], '📬': [Mailbox],
  '🔁': [Repeat], '🔎': [Search], '🔑': [KeyRound], '🕊': [Feather], '🖨': [Printer], '🗂': [FolderOpen], '🗺': [Map],
  '🙍': [User], '🚩': [Flag, 'text-red-500'], '🚶': [Footprints], '🤖': [Bot], '🤝': [Handshake], '🧠': [Brain], '🧩': [Puzzle],
  '🧱': [BrickWall], '🏛': [Landmark], '🚜': [Tractor], '🏪': [Store],
  '🥇': [Medal, 'text-[#D4AF37]'], '🥈': [Medal, 'text-[#9CA3AF]'], '🥉': [Medal, 'text-[#CD7F32]'],
}

export default function Glyph({ e, className = '' }: { e: string; className?: string }) {
  const hit = MAP[e.replace(/️/g, '')]
  if (!hit) return <span aria-hidden>{e}</span>
  const [Icon, tone] = hit
  return <Icon aria-hidden strokeWidth={1.8} className={`inline-block w-[1em] h-[1em] align-[-0.15em] shrink-0 ${tone || ''} ${className}`} />
}
