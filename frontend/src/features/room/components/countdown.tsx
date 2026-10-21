import { cn } from '@/lib/utils'
import { Timer } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'
import { useEffect, useState } from 'react'

export function Countdown({ room }: { room: RoomView }) {
  const [now, setNow] = useState(Date.now())
  const [clock, setClock] = useState({ server: room.serverTime, local: Date.now() })
  useEffect(() => {
    setClock({ server: room.serverTime, local: Date.now() })
  }, [room.serverTime])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])
  if (!room.turnEndsAt)
    return (
      <span className="turn-no-timer">
        <Timer size={17} aria-hidden="true" />
        Sem pressa
      </span>
    )
  const remaining = Math.min(
    room.settings.turnSeconds,
    Math.max(0, Math.ceil((room.turnEndsAt - (now + clock.server - clock.local)) / 1000)),
  )
  return (
    <div
      className={cn('countdown', remaining <= 15 && 'countdown-urgent')}
      role="timer"
      aria-label={`Tempo restante: ${remaining} segundos`}
    >
      <Timer size={20} aria-hidden="true" />
      <span>
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
      </span>
    </div>
  )
}
