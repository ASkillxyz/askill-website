'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { connectAndSign, hasInjectedWallet } from '@/lib/web3'

interface AuthModalProps {
  onClose: () => void
}

type Step = 'choose' | 'web3-connecting' | 'web3-signing' | 'error'

// ─── Wallet option button ──────────────────────────────────────────────────────
function WalletBtn({
  icon,
  label,
  sub,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
        bg-white/[0.04] border border-white/10
        hover:border-cyan-300/20 hover:bg-white/[0.06]
        transition-all duration-150 text-left
        disabled:opacity-40 disabled:cursor-not-allowed
      "
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#091423]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="flex-shrink-0 text-muted-soft">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="3"/>
      <path className="opacity-75" fill="#22c55e" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────
export function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep]       = useState<Step>('choose')
  const [errMsg, setErrMsg]   = useState('')
  const walletAvailable       = hasInjectedWallet()

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // ── OAuth providers ──────────────────────────────────────────────────────────
  function handleGitHub() {
    signIn('github', { callbackUrl: '/' })
  }
  function handleGoogle() {
    signIn('google', { callbackUrl: '/' })
  }

  // ── Web3 wallet ──────────────────────────────────────────────────────────────
  const handleWeb3 = useCallback(async () => {
    try {
      setStep('web3-connecting')
      const creds = await connectAndSign()
      setStep('web3-signing')
      const result = await signIn('web3', {
        redirect:  false,
        address:   creds.address,
        message:   creds.message,
        signature: creds.signature,
      })
      if (result?.error) throw new Error(result.error)
      onClose()
      window.location.reload()
    } catch (err: any) {
      const msg =
        err?.message === 'NO_WALLET'
          ? '未检测到钱包插件，请先安装 MetaMask。'
          : err?.message === 'NO_ACCOUNTS'
          ? '未获取到钱包账户，请在钱包中授权后重试。'
          : err?.code === 4001
          ? '用户取消了签名请求。'
          : '钱包登录失败，请重试。'
      setErrMsg(msg)
      setStep('error')
    }
  }, [onClose])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: 'rgba(2, 6, 14, 0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="tech-panel tech-outline relative w-full max-w-sm overflow-hidden p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-xl leading-none text-muted transition-all hover:bg-white/[0.06] hover:text-white"
        >
          ×
        </button>

        {/* ── Choose step ─────────────────────────────────────────────────── */}
        {step === 'choose' && (
          <>
            {/* Header */}
            <div className="mb-7">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-accent">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="#0a0c0f">
                    <circle cx="8" cy="8" r="3"/>
                    <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#0a0c0f" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-mono text-sm font-bold text-accent">OpenClaw Skills</span>
              </div>
              <h2 className="mt-3 text-lg font-medium text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-muted">Choose how you'd like to sign in</p>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-2.5 mb-4">
              <WalletBtn
                onClick={handleGitHub}
                label="Continue with GitHub"
                sub="Recommended for developers"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#f0f2f5">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                }
              />

              <WalletBtn
                onClick={handleGoogle}
                label="Continue with Google"
                sub="Use your Google account"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/[0.07]"/>
              <span className="text-xs text-gray-600">or connect wallet</span>
              <div className="flex-1 h-px bg-white/[0.07]"/>
            </div>

            {/* Web3 wallets */}
            <div className="space-y-2.5">
              {/* MetaMask / injected */}
              <WalletBtn
                onClick={handleWeb3}
                label={walletAvailable ? 'MetaMask / Browser Wallet' : 'MetaMask (not detected)'}
                sub={walletAvailable ? 'Sign in with your Ethereum wallet' : 'Install MetaMask extension first'}
                disabled={!walletAvailable}
                icon={
                  <svg width="20" height="20" viewBox="0 0 35 33" fill="none">
                    <path d="M32.958 1l-13.134 9.718 2.442-5.727L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.042 1l13.018 9.809-2.326-5.818L2.042 1zM28.169 23.534l-3.494 5.353 7.474 2.056 2.144-7.298-6.124-.111zM.717 23.645l2.132 7.298 7.462-2.056-3.482-5.353-6.112.111z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.928 14.453l-2.086 3.155 7.428.338-.248-7.985-5.094 4.492zM25.072 14.453l-5.163-4.583-.169 8.076 7.417-.338-2.085-3.155zM10.311 28.887l4.468-2.167-3.852-3.007-.616 5.174zM20.221 26.72l4.456 2.167-.604-5.174-3.852 3.007z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M24.677 28.887l-4.456-2.167.358 2.913-.04 1.231 4.138-1.977zM10.311 28.887l4.15 1.977-.029-1.231.348-2.913-4.469 2.167z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.528 21.691l-3.715-.087 2.613-1.2 1.102 1.287zM20.46 21.691l1.114-1.287 2.624 1.2-3.738.087z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.311 28.887l.639-5.353-4.121.111 3.482 5.242zM24.038 23.534l.639 5.353 3.494-5.242-4.133-.111zM27.157 17.608l-7.417.338.689 3.745 1.114-1.287 2.624 1.2 2.99-4.996zM10.813 21.604l2.613-1.2 1.102 1.287.689-3.745-7.428-.338 3.024 3.996z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.842 17.608l3.11 6.066-.104-3.07-3.006-2.996zM24.163 20.604l-.116 3.07 3.11-6.066-2.994 2.996zM15.27 17.946l-.689 3.745.869 4.484.196-5.912-.376-2.317zM19.73 17.946l-.364 2.305.184 5.924.881-4.484-.701-3.745z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              />

              {/* WalletConnect placeholder */}
              <WalletBtn
                onClick={() => {
                  setErrMsg('WalletConnect 需要配置 Project ID。请参阅 README 了解接入方法。')
                  setStep('error')
                }}
                label="WalletConnect"
                sub="Scan with any mobile wallet"
                icon={
                  <svg width="20" height="20" viewBox="0 0 300 185" fill="none">
                    <path d="M61.4 36.2c49-47.9 128.5-47.9 177.4 0l5.9 5.8c2.5 2.4 2.5 6.3 0 8.7l-20.1 19.7c-1.2 1.2-3.2 1.2-4.4 0l-8.1-7.9c-34.2-33.4-89.6-33.4-123.8 0l-8.7 8.5c-1.2 1.2-3.2 1.2-4.4 0L54.6 51.3c-2.5-2.4-2.5-6.3 0-8.7l6.8-6.4zm219.1 40.8l17.9 17.5c2.5 2.4 2.5 6.3 0 8.7l-80.7 79c-2.5 2.4-6.5 2.4-8.9 0l-57.3-56.1c-.6-.6-1.6-.6-2.2 0l-57.3 56.1c-2.5 2.4-6.5 2.4-8.9 0l-80.8-79c-2.5-2.4-2.5-6.3 0-8.7l17.9-17.5c2.5-2.4 6.5-2.4 8.9 0l57.3 56.1c.6.6 1.6.6 2.2 0l57.3-56.1c2.5-2.4 6.5-2.4 8.9 0l57.3 56.1c.6.6 1.6.6 2.2 0l57.3-56.1c2.4-2.4 6.5-2.4 8.9 0z" fill="#3B99FC"/>
                  </svg>
                }
              />
            </div>

            {/* Footer */}
            <p className="mt-5 text-center text-xs leading-relaxed text-muted-soft">
              By signing in, you agree to our{' '}
              <a href="#" className="text-accent hover:underline">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>
            </p>
          </>
        )}

        {/* ── Web3 connecting step ─────────────────────────────────────────── */}
        {(step === 'web3-connecting' || step === 'web3-signing') && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-5">
              <Spinner />
            </div>
            <h3 className="mb-2 text-base font-medium text-white">
              {step === 'web3-connecting' ? 'Connecting wallet…' : 'Waiting for signature…'}
            </h3>
            <p className="text-sm text-muted">
              {step === 'web3-connecting'
                ? 'Please unlock your wallet and approve the connection.'
                : 'Check your wallet — a signature request has been sent.'}
            </p>
          </div>
        )}

        {/* ── Error step ───────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 className="mb-2 text-base font-medium text-white">Sign in failed</h3>
            <p className="mb-6 text-sm text-muted">{errMsg}</p>
            <button
              onClick={() => setStep('choose')}
              className="btn-secondary px-5 py-2"
            >
              ← Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
