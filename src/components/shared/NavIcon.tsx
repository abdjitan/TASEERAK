'use client'
// Line icons for the dashboard menu (approved navy/gold design: a monoline glyph in a small framed
// tile). Chosen by the link's path, so nav.ts keeps its emoji only as a fallback for unknown links.
import type { ReactNode } from 'react'
import {
  House, FilePlus2, ClipboardList, Package, FileSpreadsheet, MessageSquare, TrendingUp, MapPin,
  Settings, ShieldCheck, Search, FolderTree, Brain, Target, ChartLine, Trophy, Building2, Users, Star, UserPlus,
} from 'lucide-react'

const BY_PATH: [RegExp, any][] = [
  [/^\/admin\/discover/, Search], [/^\/admin\/taxonomy/, FolderTree], [/^\/admin\/learning/, Brain], [/^\/admin$/, ShieldCheck],
  [/^\/supplier\/dashboard$/, House], [/^\/supplier\/deals/, Package], [/^\/supplier\/specialties/, Target],
  [/^\/supplier\/prices/, ChartLine], [/^\/supplier\/analytics/, Trophy], [/^\/supplier\/branches/, Building2],
  [/^\/supplier\/team/, Users], [/^\/supplier\/subscription/, Star],
  [/^\/contractor$/, House], [/^\/contractor\/rfq\/quick/, FilePlus2], [/^\/contractor\/rfqs/, ClipboardList],
  [/^\/contractor\/orders/, Package], [/^\/contractor\/project/, FileSpreadsheet],
  [/^\/messages/, MessageSquare], [/^\/market/, TrendingUp], [/^\/location/, MapPin], [/^\/settings/, Settings], [/^\/invite-friends/, UserPlus],
]

export default function NavIcon({ href, fallback, className = 'w-[18px] h-[18px]' }: { href: string; fallback?: ReactNode; className?: string }) {
  const Icon = BY_PATH.find(([re]) => re.test(href))?.[1]
  if (!Icon) return <span className="text-[16px] leading-none">{fallback}</span>
  return <Icon className={className} strokeWidth={1.9} aria-hidden />
}
