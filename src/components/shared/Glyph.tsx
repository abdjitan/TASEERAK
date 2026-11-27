// Round-4 UX-113: warning/waiting marks in dark gold #9D7425, the orange dot in brand gold (the orange palette is remapped).
// Inline line icons that replace the old emoji (design language: one stroke icon set, no emoji).
// Sized 1em so it follows the surrounding text size (text-5xl empty-state tiles stay big).
import {
  Building2, MapPin, Phone, Trash2, Clock, User, Users, Search, TrendingUp, BarChart3, Trophy, Package, Sparkles,
  ReceiptText, Bell, Lock, AlertTriangle, XCircle, CheckCircle2, ClipboardList, Upload, Target, Hourglass, Star,
  Hand, Inbox, Circle, Tag, CalendarDays, Settings2, MessageCircle, AlarmClock, Ban, Zap, Paperclip, Camera,
  ShieldCheck, TrendingDown, HelpCircle, FileText, PenLine, HardHat, Truck, Home, CreditCard, Lightbulb,
  Menu, Scale, Globe, Sprout, Medal, Factory, Eye, Wallet, Ruler, Files, Mail, Mailbox, Repeat, KeyRound, Feather,
  Printer, FolderOpen, Map, Flag, Footprints, Bot, Handshake, Brain, Puzzle, BrickWall, Landmark, Tractor, Store, Plus, Pencil,
  Timer, Info, Download, Play, Pause, Undo2, Mic, Wrench,
  Check, ChevronDown, ChevronUp, X, Bolt, DoorOpen, ShowerHead, Plug, LifeBuoy, Globe2,
} from 'lucide-react'

const MAP: Record<string, [any, string?]> = {
  '🏢': [Building2], '📍': [MapPin], '📞': [Phone], '🗑': [Trash2], '🕐': [Clock], '👤': [User], '👥': [Users],
  '🔍': [Search], '📈': [TrendingUp], '📊': [BarChart3], '🏆': [Trophy, 'text-[#D4A543]'], '📦': [Package],
  '🎉': [Sparkles, 'text-[#D4A543]'], '🧾': [ReceiptText], '🔔': [Bell], '🔒': [Lock], '⚠': [AlertTriangle, 'text-[#9D7425]'],
  '❌': [XCircle, 'text-red-500'], '✅': [CheckCircle2, 'text-[#0F6E56]'], '📋': [ClipboardList], '📤': [Upload],
  '🎯': [Target], '⏳': [Hourglass, 'text-[#9D7425]'], '⭐': [Star, 'text-[#9D7425] fill-[#9D7425]'], '👋': [Hand, 'text-[#D4A543]'],
  '📥': [Inbox], '💵': [Wallet],
  '📭': [Inbox], '🟢': [Circle, 'text-[#0F6E56] fill-[#0F6E56]'], '🔴': [Circle, 'text-red-500 fill-red-500'],
  '🟠': [Circle, 'text-[#D4A543] fill-[#D4A543]'], '⏰': [AlarmClock], '🗓': [CalendarDays], '📅': [CalendarDays],
  '⚙': [Settings2], '💬': [MessageCircle], '🚫': [Ban, 'text-red-500'], '⚡': [Zap], '📎': [Paperclip], '📷': [Camera],
  '🛡': [ShieldCheck], '📉': [TrendingDown], '❓': [HelpCircle], '📄': [FileText], '📝': [PenLine], '🏗': [HardHat],
  '🚚': [Truck], '🏘': [Home], '💳': [CreditCard], '💡': [Lightbulb, 'text-[#D4A543]'], '🎁': [Sparkles], '🏷': [Tag],
  '☰': [Menu], '⚖': [Scale], '⛔': [Ban, 'text-red-500'], '🌐': [Globe], '🌱': [Sprout, 'text-emerald-600'], '🏅': [Medal, 'text-[#D4A543]'],
  '🏭': [Factory], '👁': [Eye], '👷': [HardHat], '💰': [Wallet], '📏': [Ruler], '📑': [Files], '📨': [Mail], '📬': [Mailbox],
  '🔁': [Repeat], '🔎': [Search], '🔑': [KeyRound], '🕊': [Feather], '🖨': [Printer], '🗂': [FolderOpen], '🗺': [Map],
  '🙍': [User], '🚩': [Flag, 'text-red-500'], '🚶': [Footprints], '🤖': [Bot], '🤝': [Handshake], '🧠': [Brain], '🧩': [Puzzle],
  '🧱': [BrickWall], '🏛': [Landmark], '🚜': [Tractor], '🏪': [Store],
  '✉': [Mail], '❔': [HelpCircle], '✨': [Sparkles, 'text-[#D4A543]'], '➕': [Plus], '✏': [Pencil],
  '⏱': [Timer], 'ℹ': [Info], '⬆': [Upload], '⬇': [Download], '▶': [Play], '⏸': [Pause], '↩': [Undo2], '⏺': [Mic], '🆕': [Sparkles], '🔧': [Wrench],
  // brand gold, silver-grey and dark gold (round-7 UX-175)
  '🥇': [Medal, 'text-[#D4A543]'], '🥈': [Medal, 'text-[#728196]'], '🥉': [Medal, 'text-[#9D7425]'],
  // text marks drawn in another font before (UX-158)
  '✓': [Check], '✔': [Check], '▾': [ChevronDown], '▴': [ChevronUp], '×': [X], '✕': [X], '✖': [X],
  '🔩': [Bolt], '🚪': [DoorOpen], '🚿': [ShowerHead], '🔌': [Plug], '🛟': [LifeBuoy], '🌍': [Globe2],
}

// An unknown emoji draws a neutral line icon (Package), never the colour emoji itself (UX-158).
export default function Glyph({ e, className = '' }: { e: string; className?: string }) {
  const hit = MAP[e.replace(/️/g, '')] || [Package]
  const [Icon, tone] = hit
  return <Icon aria-hidden strokeWidth={1.8} className={`inline-block w-[1em] h-[1em] align-[-0.15em] shrink-0 ${tone || ''} ${className}`} />
}
