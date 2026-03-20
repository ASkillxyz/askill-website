import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="font-mono text-6xl text-green-400 mb-4">404</div>
      <h1 className="text-xl font-medium mb-2">Skill not found</h1>
      <p className="text-sm text-gray-500 mb-8">
        This skill doesn't exist or may have been removed.
      </p>
      <Link
        href="/skills"
        className="px-5 py-2 rounded-lg bg-green-500 text-[#0a0c0f] font-semibold text-sm hover:bg-green-400 transition-all"
      >
        Browse all skills
      </Link>
    </div>
  )
}
