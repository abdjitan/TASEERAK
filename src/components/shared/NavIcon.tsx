'use client'
// Line icons for the dashboard menu (approved navy/gold design: a monoline glyph in a small framed
// tile). Chosen by the link's path; an unknown link gets a neutral circle, never an emoji (UX-158).
import type { ReactNode } from 'react'
import {
  House, FilePlus2, ClipboardList, Package, FileSpreadsheet, MessageSquare, TrendingUp, MapPin,
  Settings, ShieldCheck, Search, FolderTree, Brain, Target, ChartLine, Trophy, Building2, Users, Star, UserPlus, Lightbulb, FileStack,
  LifeBuoy, Bell, Circle, LayoutDashboard, FileText, Bot, Flag, MessageCircle,
} from 'lucide-react'

const BY_PATH: [RegExp, any][] = [
  [/^\/admin\/discover/, Search], [/^\/admin\/taxonomy/, FolderTree], [/^\/admin\/learning/, Brain], [/^\/admin\/invites/, MessageSquare], [/^\/admin\/suggestions/, Lightbulb], [/^\/suggestions/, Lightbulb], [/^\/admin$/, ShieldCheck],
  [/^\/admin\/overview/, LayoutDashboard], [/^\/admin\/report$/, FileText], [/^\/admin\/ai-lab/, Bot], [/^\/admin\/reports/, Flag], [/^\/admin\/whatsapp/, MessageCircle], [/^\/admin\//, ShieldCheck],
  [/^\/supplier\/dashboard$/, House], [/^\/supplier\/deals/, Package], [/^\/supplier\/specialties/, Target],
  [/^\/supplier\/prices/, ChartLine], [/^\/supplier\/analytics/, Trophy], [/^\/supplier\/branches/, Building2],
  [/^\/supplier\/team/, Users], [/^\/supplier\/subscription/, Star],
  [/^\/contractor$/, House], [/^\/contractor\/rfq\/quick/, FilePlus2], [/^\/contractor\/rfqs/, ClipboardList],
  [/^\/contractor\/orders/, Package], [/^\/contractor\/project/, FileSpreadsheet], [/^\/contractor\/tender/, FileStack],
  [/^\/messages/, MessageSquare], [/^\/market/, TrendingUp], [/^\/location/, MapPin], [/^\/settings/, Settings], [/^\/invite-friends/, UserPlus],
  [/^\/support/, LifeBuoy], [/^\/notifications/, Bell],
]

// `fallback` is kept for call-site compatibility only; an unmatched path draws a plain circle.
export default function NavIcon({ href, className = 'w-[18px] h-[18px]' }: { href: string; fallback?: ReactNode; className?: string }) {
  const Icon = BY_PATH.find(([re]) => re.test(href))?.[1] || Circle
  return <Icon className={className} strokeWidth={1.9} aria-hidden />
}
