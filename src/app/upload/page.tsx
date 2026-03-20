'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ALL_CATEGORIES } from '@/lib/data'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function UploadPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [name, setName]               = useState('')
  const [slug, setSlug]               = useState('')
  const [desc, setDesc]               = useState('')
  const [repo, setRepo]               = useState('')
  const [full, setFull]               = useState('')
  const [selectedCats, setSelectedCats] = useState<Category[]>([])
  const [status, setStatus]           = useState<Status>('idle')
  const [result, setResult]           = useState<{ slug: string; prUrl: string | null; message: string } | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')

  function handleNameChange(val: string) {
    setName(val)
    setSlug(slugify(val))
  }

  function toggleCat(cat: Category) {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) { setErrorMsg('文件不能超过 500KB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setFull(ev.target?.result as string ?? '')
    reader.readAsText(file, 'utf-8')
  }

  async function handleSubmit() {
    if (!name || !desc || !full || selectedCats.length === 0) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, fullMarkdown: full, githubRepo: repo || undefined, categories: selectedCats }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? '提交失败，请重试'); setStatus('error'); return }
      setResult({ slug: data.slug, prUrl: data.prUrl, message: data.message })
      setStatus('success')
    } catch {
      setErrorMsg('网络错误，请重试')
      setStatus('error')
    }
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-medium mb-2">请先登录</h2>
        <p className="text-sm text-gray-500 mb-6">上传技能需要登录账号</p>
        <button onClick={() => router.push('/')} className="px-5 py-2 rounded-lg bg-green-500 text-[#0a0c0f] font-semibold text-sm hover:bg-green-400 transition-all">返回首页登录</button>
      </div>
    )
  }

  if (status === 'success' && result) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-xl font-medium text-green-400 mb-2">提交成功！</h2>
        <p className="text-sm text-gray-500 mb-6">{result.message}</p>
        <div className="bg-[#111318] border border-white/[0.07] rounded-lg p-4 text-left mb-6">
          <div className="text-xs text-gray-500 font-mono mb-1">// INSTALL COMMAND（审核后生效）</div>
          <code className="text-sm text-green-400 font-mono">claw add gh:{(session?.user as any)?.username}/{result.slug}</code>
        </div>
        <div className="flex gap-3 justify-center">
          {result.prUrl && <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2 rounded-lg border border-white/[0.12] text-sm text-gray-400 hover:text-[#f0f2f5] transition-all">查看 PR →</a>}
          <button onClick={() => router.push('/skills')} className="px-5 py-2 rounded-lg bg-green-500 text-[#0a0c0f] font-semibold text-sm hover:bg-green-400 transition-all">浏览技能库</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium mb-1">Upload a Skill</h1>
      <p className="text-sm text-gray-500 mb-8">提交后会自动创建 GitHub PR，审核通过即发布。</p>

      {status === 'error' && errorMsg && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{errorMsg}</div>
      )}

      <div className="mb-5">
        <label className="block text-xs font-mono text-gray-500 mb-1.5">SKILL NAME *</label>
        <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Gmail Summarizer" className="w-full bg-[#111318] border border-white/[0.12] rounded-lg px-4 py-2.5 text-sm text-[#f0f2f5] placeholder-gray-600"/>
        {slug && <p className="text-xs text-gray-500 mt-1.5 font-mono">slug: <span className="text-green-400">{slug}</span></p>}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-mono text-gray-500 mb-1.5">SHORT DESCRIPTION *</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="一句话说明这个 skill 做什么" maxLength={200} className="w-full bg-[#111318] border border-white/[0.12] rounded-lg px-4 py-2.5 text-sm text-[#f0f2f5] placeholder-gray-600"/>
        <p className="text-xs text-gray-600 mt-1">{desc.length}/200</p>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-mono text-gray-500 mb-1.5">GITHUB REPO <span className="text-gray-600">（可选）</span></label>
        <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/username/skill-name" className="w-full bg-[#111318] border border-white/[0.12] rounded-lg px-4 py-2.5 text-sm text-[#f0f2f5] placeholder-gray-600"/>
        {slug && <p className="text-xs text-gray-600 mt-1 font-mono">安装命令：claw add gh:{(session?.user as any)?.username ?? 'you'}/{slug}</p>}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-mono text-gray-500 mb-2">CATEGORIES *</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => toggleCat(cat)} className={['px-3 py-1 rounded-full text-xs border transition-all', selectedCats.includes(cat) ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-white/[0.07] text-gray-500 hover:border-white/[0.12] hover:text-[#f0f2f5]'].join(' ')}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-mono text-gray-500 mb-1.5">SKILL.MD FILE *</label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/[0.12] rounded-xl p-8 text-center cursor-pointer hover:border-green-500/25 transition-all">
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm text-gray-500"><span className="text-green-400">点击上传</span> SKILL.md 文件</p>
          <p className="text-xs text-gray-600 mt-1">Markdown · 最大 500KB</p>
          <input type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload}/>
        </label>
        {full && <p className="text-xs text-green-400 mt-2 font-mono">✓ 已读取 {full.length} 字符</p>}
      </div>

      <div className="mb-8">
        <label className="block text-xs font-mono text-gray-500 mb-1.5">或直接粘贴 SKILL.MD 内容</label>
        <textarea value={full} onChange={e => setFull(e.target.value)} rows={8} placeholder={'## What this skill does\n\n详细描述...'} className="w-full bg-[#111318] border border-white/[0.12] rounded-lg px-4 py-3 text-sm text-[#f0f2f5] placeholder-gray-600 font-mono resize-y"/>
      </div>

      <button onClick={handleSubmit} disabled={!name || !desc || !full || selectedCats.length === 0 || status === 'submitting'} className="w-full py-3 rounded-lg bg-green-500 text-[#0a0c0f] font-semibold text-sm hover:bg-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {status === 'submitting' ? (<><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>提交中…</>) : 'Submit for Review'}
      </button>
      <p className="text-xs text-gray-600 text-center mt-3">提交后自动创建 GitHub PR · 审核通过后发布</p>
    </div>
  )
}