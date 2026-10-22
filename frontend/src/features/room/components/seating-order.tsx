import { useState } from 'react'
import { ArrowUp, ArrowDown, UsersThree } from '@phosphor-icons/react'
import type { RoomView } from '@whoami/shared'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { gameClient, useGame } from '@/lib/game-client'

export function SeatingOrder({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const { error } = useGame()
  const [open, setOpen] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const changed =
    order.length !== room.players.length ||
    order.some((id) => !room.players.some((p) => p.id === id))
  function move(index: number, offset: number) {
    setOrder((previous) => {
      const next = [...previous]
      const other = index + offset
      if (other < 0 || other >= next.length) return previous
      ;[next[index], next[other]] = [next[other]!, next[index]!]
      return next
    })
  }
  return (
    <div className="seating-order">
      <p>Sentido horário: {room.players.map((p) => p.name).join(' → ')}</p>
      {room.hostId === room.selfId && (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value)
            if (value) {
              gameClient.clearError()
              setOrder(room.players.map((p) => p.id))
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled || room.players.length < 2}>
              <UsersThree aria-hidden="true" /> Organizar roda
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Como vocês estão sentados?</DialogTitle>
              <DialogDescription>
                Escolha uma pessoa para começar e siga a roda no sentido horário. Todos precisarão
                marcar que estão prontos novamente.
              </DialogDescription>
            </DialogHeader>
            {changed && (
              <div role="status" className="space-y-2">
                <p>Os jogadores mudaram. Atualize a lista antes de salvar.</p>
                <Button variant="outline" onClick={() => setOrder(room.players.map((p) => p.id))}>
                  Atualizar jogadores
                </Button>
              </div>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <ol className="seat-order-list">
              {order.map((id, index) => {
                const player = room.players.find((p) => p.id === id)
                if (!player) return null
                return (
                  <li key={id}>
                    <span className="seat-order-number">{index + 1}</span>
                    <Avatar avatar={player.avatar} />
                    <strong>{player.name}</strong>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Mover ${player.name} para antes`}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Mover ${player.name} para depois`}
                      disabled={disabled || index === order.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ol>
            <Button
              disabled={disabled || changed}
              onClick={async () => {
                if (await gameClient.command({ type: 'room:seats', playerIds: order }))
                  setOpen(false)
              }}
            >
              Salvar ordem da roda
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
