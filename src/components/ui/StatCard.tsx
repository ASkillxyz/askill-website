interface StatCardProps {
  value: string
  label: string
  accent?: boolean
}

export function StatCard({ value, label, accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="section-mono-title mb-3">{label}</div>
      <div className="text-3xl font-semibold tracking-[-0.05em] text-white">
        {accent ? <span className="text-accent">{value}</span> : value}
      </div>
      <div className="mt-2 text-sm text-muted">Live community signal</div>
    </div>
  )
}
