'use client'

// أيقونات SVG احترافية (خطّية) لمجموعات المواد والقطاعات — بديلة للإيموجي.
// stroke = currentColor، فاللون يأتي من عنصر الأب (text color).
import { ReactNode } from 'react'
import { ICON_SVGS } from './catIconSvgs'

const P: Record<string, ReactNode> = {
  box: <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
  layers: <><path d="m12.8 2.2 8.6 3.9a1 1 0 0 1 0 1.8l-8.6 3.9a2 2 0 0 1-1.6 0L2.6 7.9a1 1 0 0 1 0-1.8l8.6-3.9a2 2 0 0 1 1.6 0Z" /><path d="m22 12.7-9.2 4.1a2 2 0 0 1-1.6 0L2 12.7" /><path d="m22 17.7-9.2 4.1a2 2 0 0 1-1.6 0L2 17.7" /></>,
  brick: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M8 3v6M14 9v6M8 15v6M14 3" /></>,
  beam: <><path d="M5 5h14M5 19h14M12 5v14" /></>,
  mountain: <><path d="m8 3 4 8 4-4 4 13H2z" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></>,
  droplet: <><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9 6 10.6 5 12.5 5 15a7 7 0 0 0 7 7Z" /></>,
  tree: <><path d="M12 2 7 9h3l-4 6h4v5h4v-5h4l-4-6h3z" /></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  paint: <><rect x="2" y="3" width="9" height="6" rx="1" /><path d="M11 6h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-5a2 2 0 0 0-2 2v1" /><rect x="9" y="16" width="6" height="5" rx="1" /></>,
  door: <><path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h20M13 4.6v16.1a1 1 0 0 1-1.2 1L5 20V5.6a2 2 0 0 1 1.5-1.9l4-1A2 2 0 0 1 13 4.6Z" /><path d="M10 12v.01" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>,
  waves: <><path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4" /></>,
  snowflake: <><path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20" /><path d="m8 5 4 3 4-3M8 19l4-3 4 3M5 8l3 4-3 4M19 8l-3 4 3 4" /></>,
  wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.8-.4-.4-2.8z" /></>,
  flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>,
  zap: <><path d="M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.5l-1.9 6a1 1 0 0 0 1 1.3h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.5l1.9-6a1 1 0 0 0-1-1.3z" /></>,
  bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5A4.5 4.5 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4" /></>,
  camera: <><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
  truck: <><path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2" /><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" /></>,
  ladder: <><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" /></>,
}

// مفتاح المجموعة/القطاع → أيقونة
const MAP: Record<string, string> = {
  // مدني
  concrete: 'layers', masonry: 'brick', steel: 'beam', rawmaterials: 'mountain',
  infrastructure: 'shield', drainage_grp: 'droplet', formwork: 'beam', scaffolding: 'ladder', landscape: 'tree',
  // معماري
  floors_walls: 'grid', paint_facade: 'paint', ceiling_decor: 'grid', doors_windows: 'door',
  facade_systems: 'building', joinery: 'beam', acoustic: 'waves', sanitary_finish: 'droplet',
  building_insulation: 'shield', arch_metalwork: 'building',
  // ميكانيك
  hvac: 'snowflake', plumbing: 'droplet', plumbing_supplies: 'wrench', firefighting: 'flame', mech_insulation: 'waves',
  // كهرباء
  cabling: 'zap', panels_switches: 'grid', lighting: 'bulb', low_current: 'camera',
  // آليات
  heavy_equipment: 'truck', light_equipment: 'cog', concrete_machinery: 'cog', access_equipment: 'ladder',
  // محل توريد
  store_plumbing: 'droplet', store_electrical: 'zap', store_tools: 'wrench',
  store_fasteners: 'cog', store_safety: 'shield', store_paint: 'paint',
  // قطاعات
  civil: 'building', architectural: 'layers', electrical: 'zap', mechanical: 'cog',
  equip: 'truck', equipment: 'truck', supply_store: 'box',
}

export default function CatIcon({ k, className = 'w-5 h-5' }: { k: string; className?: string }) {
  const svgProps = {
    viewBox: '0 0 24 24', className, fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  }
  // أيقونات المصمّم (SVG) أولاً — وإلا نرجع للأيقونات المضمّنة (الآليات + أي مجموعة بدون أيقونة جديدة)
  const designer = ICON_SVGS[k]
  if (designer) return <svg {...svgProps} dangerouslySetInnerHTML={{ __html: designer }} />
  return <svg {...svgProps}>{P[MAP[k] || ''] || P.box}</svg>
}
