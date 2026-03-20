'use client'

import { useState } from 'react'

interface CheckResult {
  ok: boolean
  label: string
  detail?: string
  ms?: number
}

interface DebugResponse {
  timestamp: string
  allOk: boolean
  results: CheckResult[]
  rows: any[]
  total: number
}

export default function DebugPage() {
  const [data, setData]       = useState<DebugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function runCheck() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/debug')
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? `HTTP ${res.status}`)
        return
      }
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap py-10">
      <div className="mb-6">
        <div className="section-mono-title mb-2">// 开发工具</div>
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">数据库连接诊断</h1>
        <p className="mt-2 text-sm text-muted">仅限开发环境。验证 Supabase 配置与 skills 表状态。</p>
      </div>

      <button
        onClick={runCheck}
        disabled={loading}
        className="btn-primary mb-8 flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            检测中…
          </>
        ) : '运行诊断'}
      </button>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-300">
          <span className="font-mono mr-2">ERR</span>{error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* 总体状态 */}
          <div className={`tech-panel tech-outline flex items-center gap-4 px-6 py-5 ${data.allOk ? 'border-emerald-400/30' : 'border-rose-400/30'}`}>
            <div className={`h-3 w-3 rounded-full ${data.allOk ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <div>
              <div className="text-base font-semibold">
                {data.allOk ? '✓ 所有检查通过' : '✗ 存在问题，请查看下方详情'}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-muted-soft">{data.timestamp}</div>
            </div>
          </div>

          {/* 逐项结果 */}
          <div className="tech-panel-soft tech-outline overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3">
              <span className="section-mono-title">// 检查项目</span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {data.results.map((r, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${r.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">{r.label}</span>
                      {r.ms != null && (
                        <span className="font-mono text-[10px] text-muted-soft">{r.ms}ms</span>
                      )}
                    </div>
                    {r.detail && (
                      <div className={`mt-1 font-mono text-xs ${r.ok ? 'text-muted' : 'text-rose-300'}`}>
                        {r.detail}
                      </div>
                    )}
                  </div>
                  <div className={`flex-shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                    r.ok
                      ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                      : 'bg-rose-400/10 text-rose-300 border border-rose-400/20'
                  }`}>
                    {r.ok ? 'PASS' : 'FAIL'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* skills 表预览 */}
          {data.rows?.length > 0 && (
            <div className="tech-panel-soft tech-outline overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <span className="section-mono-title">// skills 表预览</span>
                <span className="font-mono text-[11px] text-muted-soft">共 {data.total} 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['slug', 'name', 'status', 'install_count', 'created_at'].map(col => (
                        <th key={col} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-soft">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-accent">{row.slug}</td>
                        <td className="px-5 py-3 text-sm text-white">{row.name}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${
                            row.status === 'published'
                              ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                              : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-muted">{row.install_count?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-soft">
                          {row.created_at?.slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 表为空时的提示 */}
          {data.allOk && data.rows?.length === 0 && (
            <div className="tech-panel-soft tech-outline px-6 py-8 text-center">
              <div className="mb-3 font-mono text-2xl">📭</div>
              <div className="text-sm text-muted">连接成功，但 skills 表暂无数据。</div>
              <div className="mt-2 font-mono text-xs text-muted-soft">
                可在 Supabase SQL Editor 中执行 schema.sql 的 INSERT 部分插入测试数据。
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
