'use client'

import { useState } from 'react'
import { copyToClipboard, cn } from '@/lib/utils'

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
}

export function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-accent-strong',
        'whitespace-nowrap transition-all duration-150 hover:border-cyan-300/30 hover:bg-cyan-400/16 hover:text-white',
        className
      )}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}
