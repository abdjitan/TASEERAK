'use client'

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

// One button for the whole site (UX-105): 12px corners, at least 44px tall, labels wrap.
// primary = gold with navy text (the main action), secondary = navy, ghost = outlined,
// danger = red (destructive actions only). Styles live in globals.css (.btn-*).
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-navy',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${CLASS[variant]} ${extra}`.trim()
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; full?: boolean; children: ReactNode }

export default function Button({ variant = 'primary', full, className = '', type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} className={buttonClass(variant, `${full ? 'w-full' : ''} ${className}`)} {...rest}>
      {children}
    </button>
  )
}

export function ButtonLink({ href, variant = 'primary', full, className = '', children }: { href: string; variant?: ButtonVariant; full?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={buttonClass(variant, `${full ? 'w-full' : ''} ${className}`)}>{children}</Link>
}
