'use client'

import { cn } from '@/lib/utils'
import { ALL_CATEGORIES } from '@/lib/data'
import type { Category } from '@/types'

interface CategoryFilterProps {
  active: Category | 'all'
  onChange: (cat: Category | 'all') => void
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'tech-pill px-4 py-2 text-xs',
          active === 'all' && 'tech-pill-active'
        )}
      >
        全部
      </button>
      {ALL_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            'tech-pill px-4 py-2 text-xs',
            active === cat && 'tech-pill-active'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
