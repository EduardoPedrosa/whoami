import { Avatar } from '@/components/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'
import { ArrowRight, CheckCircle, HourglassMedium } from '@phosphor-icons/react'
import type { RoomView } from '@whoami/shared'
import { useState } from 'react'
import { CircleTable } from '@/features/room/components/circle-table'

export function Playing({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const active = room.players.find((p) => p.id === room.activePlayerId)
  const isMyTurn = active?.id === room.selfId
  const hasNextPlayer = room.players.some(
    (player) => player.id !== active?.id && !player.solved && !player.departed,
  )
  const target = room.players.find(
    (p) => p.id === room.assignmentTargetId && !p.solved && !p.departed,
  )
  const [confirmation, setConfirmation] = useState<{
    name: string
    playerId: string
    round: number
  } | null>(null)
  return (
    <div className="playing-content">
      <div className="turn-banner">
        <div className="turn-avatar">
          {active ? (
            <Avatar avatar={active.avatar} large />
          ) : (
            <HourglassMedium size={34} aria-hidden="true" />
          )}
        </div>
        <div className="turn-copy">
          <span>{isMyTurn ? 'SUA VEZ' : 'NA RODA'}</span>
          <h2>
            {isMyTurn
              ? 'Sua vez'
              : active
                ? `Vez de ${active.name}`
                : 'Esperando a conexão voltar.'}
          </h2>
          {!active && <p>Aguardando a reconexão de um jogador.</p>}
        </div>
      </div>
      <CircleTable room={room} />
      <div className="turn-controls">
        <div className="turn-buttons">
          {active && hasNextPlayer && (isMyTurn || room.hostId === room.selfId) && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => {
                void gameClient.command({ type: 'turn:pass', turnId: room.turnId! })
              }}
            >
              {isMyTurn ? 'Passar a vez' : 'Avançar a vez'}
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          )}
          {target && (
            <Button
              disabled={disabled}
              onClick={() =>
                setConfirmation({ name: target.name, playerId: target.id, round: room.round })
              }
            >
              <CheckCircle size={19} aria-hidden="true" />
              Confirmar acerto de {target.name}
            </Button>
          )}
        </div>
      </div>
      <AlertDialog
        open={!!confirmation && !!target && confirmation.playerId === target.id}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.name} descobriu a identidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A identidade será revelada para {confirmation?.name}, que deixará de perguntar nos
              próximos turnos. Os demais continuam jogando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>Ainda não</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={async (event) => {
                event.preventDefault()
                if (
                  confirmation &&
                  (await gameClient.command({
                    type: 'player:solve',
                    playerId: confirmation.playerId,
                    round: confirmation.round,
                  }))
                )
                  setConfirmation(null)
              }}
            >
              Confirmar acerto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
