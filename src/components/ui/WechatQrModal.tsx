'use client'

import { useState, useEffect, useRef } from 'react'

export function WechatQrModal() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* 微信图标按钮 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="text-muted-soft transition-colors hover:text-accent"
        aria-label="WeChat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.208-5.345 2.684-7.045C12.11 3.467 10.497 2.188 8.691 2.188zm-2.15 3.618c.448 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm4.297 0c.449 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm5.932 1.618c-4.26 0-7.714 2.878-7.714 6.43 0 3.554 3.453 6.432 7.714 6.432.871 0 1.71-.124 2.496-.345a.75.75 0 0 1 .627.086l1.672.979a.286.286 0 0 0 .147.048c.14 0 .255-.115.255-.26 0-.063-.026-.123-.042-.186l-.342-1.302a.516.516 0 0 1 .187-.584C22.974 17.625 24 15.87 24 13.854c0-3.552-3.454-6.43-7.23-6.43zm-2.97 3.09c.393 0 .712.318.712.712a.713.713 0 0 1-.713.712.713.713 0 0 1-.712-.712c0-.394.318-.712.712-.712zm5.9 0c.394 0 .712.318.712.712a.713.713 0 0 1-.712.712.713.713 0 0 1-.712-.712c0-.394.317-.712.712-.712z"/>
        </svg>
      </button>

      {/* 向上弹出的二维码卡片 */}
      {open && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 tech-panel tech-outline p-4 text-center"
          style={{ width: '180px' }}
        >
          {/* 小三角 */}
          <div
            className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 h-0 w-0"
            style={{
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid rgba(148,163,184,0.18)',
            }}
          />
          <p className="mb-2 text-xs font-medium text-white">扫码加入微信群</p>
          <img
            src="/qr-wechat.png"
            alt="微信群二维码"
            style={{ width: '148px', height: '148px', borderRadius: '8px', display: 'block', margin: '0 auto' }}
          />
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-soft">Scan to join</p>
        </div>
      )}
    </div>
  )
}
