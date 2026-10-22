import { useGame } from '@/lib/game-client'
import { LockSimple } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { Assigning } from '@/features/room/assigning'
import { Invite } from '@/features/room/components/invite-dialog'
import { LeaveRoom } from '@/features/room/components/leave-room'
import { PlayerRoster } from '@/features/room/components/player-roster'
import { EndGame } from '@/features/room/components/end-game'
import { RoomSteps } from '@/features/room/components/room-steps'
import { Lobby } from '@/features/room/lobby'
import { Playing } from '@/features/room/playing'
import { Results } from '@/features/room/results'

const phaseLabels = {
  lobby: 'Sala de espera',
  assigning: 'Identidades secretas',
  playing: 'Em jogo',
  finished: 'Fim da rodada',
}

export function RoomScreen({ room }: { room: RoomView }) {
  const { pending, connection } = useGame()
  const heading = useRef<HTMLHeadingElement>(null)
  const disabled = pending || connection !== 'connected'
  useEffect(() => {
    heading.current?.focus()
  }, [room.phase])
  return (
    <main id="main-content" className="room-main">
      <div className="room-page-heading">
        <div>
          <div className="room-topline">
            <LockSimple size={15} aria-hidden="true" />
            <span>SALA PRIVADA</span>
            <span className="mono">{room.code}</span>
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {phaseLabels[room.phase]}
            <span className="room-round">
              {room.round > 0 ? `Rodada ${room.round}` : 'Aguardando o início'}
            </span>
          </h1>
        </div>
        <div className="room-page-actions">
          <Invite room={room} />
          <LeaveRoom />
        </div>
      </div>
      <RoomSteps phase={room.phase} />
      <div className="room-layout">
        <section className="room-stage" aria-label={phaseLabels[room.phase]}>
          <AnimatePresence mode="wait">
            <motion.div
              key={room.phase + (room.phase === 'assigning' ? room.round : '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {room.phase === 'lobby' ? (
                <Lobby room={room} disabled={disabled} />
              ) : room.phase === 'assigning' ? (
                <Assigning room={room} disabled={disabled} />
              ) : room.phase === 'playing' ? (
                <Playing room={room} disabled={disabled} />
              ) : (
                <Results room={room} disabled={disabled} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
        <PlayerRoster room={room} />
      </div>
      <div className="room-bottom-note">
        <span>
          <LockSimple size={15} aria-hidden="true" />
          Sua carta só aparece para você quando acertar ou quando a rodada terminar.
        </span>
        {room.hostId === room.selfId && room.phase !== 'lobby' && room.phase !== 'finished' && (
          <EndGame room={room} disabled={disabled} />
        )}
      </div>
    </main>
  )
}
