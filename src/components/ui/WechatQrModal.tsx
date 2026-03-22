'use client'

import { useState, useEffect } from 'react'

export function WechatQrModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    // 防止背景滚动
    document.body.style.overflow = 'hidden'
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', fn)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', fn)
    }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-soft transition-colors hover:text-accent"
        aria-label="WeChat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.208-5.345 2.684-7.045C12.11 3.467 10.497 2.188 8.691 2.188zm-2.15 3.618c.448 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm4.297 0c.449 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm5.932 1.618c-4.26 0-7.714 2.878-7.714 6.43 0 3.554 3.453 6.432 7.714 6.432.871 0 1.71-.124 2.496-.345a.75.75 0 0 1 .627.086l1.672.979a.286.286 0 0 0 .147.048c.14 0 .255-.115.255-.26 0-.063-.026-.123-.042-.186l-.342-1.302a.516.516 0 0 1 .187-.584C22.974 17.625 24 15.87 24 13.854c0-3.552-3.454-6.43-7.23-6.43zm-2.97 3.09c.393 0 .712.318.712.712a.713.713 0 0 1-.713.712.713.713 0 0 1-.712-.712c0-.394.318-.712.712-.712zm5.9 0c.394 0 .712.318.712.712a.713.713 0 0 1-.712.712.713.713 0 0 1-.712-.712c0-.394.317-.712.712-.712z"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: 'rgba(2, 6, 14, 0.82)', backdropFilter: 'blur(10px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="tech-panel tech-outline relative overflow-hidden p-6 text-center"
            style={{ width: '260px' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-lg text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
            >×</button>

            <div className="mb-4 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#07C160">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.208-5.345 2.684-7.045C12.11 3.467 10.497 2.188 8.691 2.188zm-2.15 3.618c.448 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm4.297 0c.449 0 .81.362.81.81a.811.811 0 0 1-.81.81.811.811 0 0 1-.81-.81c0-.448.362-.81.81-.81zm5.932 1.618c-4.26 0-7.714 2.878-7.714 6.43 0 3.554 3.453 6.432 7.714 6.432.871 0 1.71-.124 2.496-.345a.75.75 0 0 1 .627.086l1.672.979a.286.286 0 0 0 .147.048c.14 0 .255-.115.255-.26 0-.063-.026-.123-.042-.186l-.342-1.302a.516.516 0 0 1 .187-.584C22.974 17.625 24 15.87 24 13.854c0-3.552-3.454-6.43-7.23-6.43zm-2.97 3.09c.393 0 .712.318.712.712a.713.713 0 0 1-.713.712.713.713 0 0 1-.712-.712c0-.394.318-.712.712-.712zm5.9 0c.394 0 .712.318.712.712a.713.713 0 0 1-.712.712.713.713 0 0 1-.712-.712c0-.394.317-.712.712-.712z"/>
              </svg>
              <span className="text-sm font-medium text-white">扫码加入微信群</span>
            </div>

            <img
              src="/qr-wechat.png"
              alt="微信群二维码"
              style={{ width: '200px', height: '200px', borderRadius: '10px', display: 'block', margin: '0 auto' }}
            />

            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-soft">
              Scan to join
            </p>
          </div>
        </div>
      )}
    </>
  )
}
