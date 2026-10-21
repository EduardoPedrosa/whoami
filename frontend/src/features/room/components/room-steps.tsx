import { cn } from '@/lib/utils'
import { ArrowRight, Check } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'

export function RoomSteps({ phase }: { phase: RoomView['phase'] }) {
  const current = phase === 'lobby' ? 0 : phase === 'assigning' ? 1 : 2
  return (
    <ol className="room-steps" aria-label="Etapas da partida">
      {['Entre na sala', 'Escolha as identidades', 'Descubra quem é'].map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className={cn(i <= current && 'step-active')}
        >
          <span>{i < current ? <Check size={13} weight="bold" aria-hidden="true" /> : i + 1}</span>
          <span>{label}</span>
          {i < 2 && <ArrowRight size={14} aria-hidden="true" className="step-arrow" />}
        </li>
      ))}
    </ol>
  )
}
