import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import LandingBoot from '@/components/LandingBoot'

export const metadata: Metadata = {
  title: 'تسعيرك | Taseerak — منصة التسعير والتوريد للمقاولين',
  description: 'اطلب تسعيرة واحدة، يتنافس عليها أفضل الموردين. منصة التسعير والتوريد للمقاولين في السعودية.',
}

// The marketing landing is the high-fidelity design (hero canvas, live-offer card,
// BOQ demo, sections, footer). It uses the design's own stylesheet + script, which
// are served from /public/design. The markup lives in src/lib/landing.html and is
// read at build time and inlined here.
export default function LandingPage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'landing.html'), 'utf8')
  return (
    <>
      <link rel="stylesheet" href="/design/styles.css" />
      <div id="taseerak-landing" dangerouslySetInnerHTML={{ __html: html }} />
      <LandingBoot />
    </>
  )
}
