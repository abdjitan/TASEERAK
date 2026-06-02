'use client'

import { useTranslation } from '@/i18n'

interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark'
  theme?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { icon: 28, fontSize: '15px' },
  md: { icon: 38, fontSize: '20px' },
  lg: { icon: 52, fontSize: '26px' },
}

export default function Logo({
  variant = 'full',
  theme = 'light',
  size = 'md',
  className = '',
}: LogoProps) {
  const { locale } = useTranslation()
  const s = sizes[size]
  const src = theme === 'dark' ? '/logo-outlined.png' : '/logo.png'
  const isArabic = locale === 'ar'

  const Icon = () => (
    <img src={src} alt="تسعيرك" width={s.icon} height={s.icon}
      style={{ objectFit: 'contain', display: 'block' }} />
  )

  const Wordmark = () => (
    <span style={{
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
      fontWeight: 900, fontSize: s.fontSize, letterSpacing: '-0.5px', lineHeight: 1,
    }}>
      {isArabic ? (
        <>
          <span style={{ color: theme === 'dark' ? '#ffffff' : '#1B2D5B' }}>تسعير</span>
          <span style={{ color: '#F5831F' }}>ك</span>
        </>
      ) : (
        <>
          <span style={{ color: theme === 'dark' ? '#ffffff' : '#1B2D5B' }}>Taseer</span>
          <span style={{ color: '#F5831F' }}>ak</span>
        </>
      )}
    </span>
  )

  if (variant === 'icon') return <Icon />
  if (variant === 'wordmark') return <Wordmark />

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Icon />
      <Wordmark />
    </div>
  )
}
