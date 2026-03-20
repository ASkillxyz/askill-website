import type { Skill } from '@/types'
import { SkillCard } from './SkillCard'

interface SkillsGridProps {
  skills: Skill[]
  emptyMessage?: string
}

export function SkillsGrid({ skills, emptyMessage = 'No skills found.' }: SkillsGridProps) {
  if (skills.length === 0) {
    return (
      <div className="tech-panel-soft col-span-full rounded-[24px] px-6 py-16 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  )
}
