import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { gameClient } from '@/lib/game-client'
import { CATEGORIES, type RoomSettings, type RoomView } from '@whoami/shared'
import { useEffect, useRef } from 'react'

export function Settings({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const host = room.selfId === room.hostId
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  useEffect(() => {
    if (!disabled && restoreFocus.current) {
      restoreFocus.current = false
      if (document.activeElement === document.body) trigger.current?.focus({ preventScroll: true })
    }
  }, [disabled])
  return (
    <div className="room-settings">
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={room.settings.category}
          disabled={!host || disabled}
          onValueChange={(category) => {
            restoreFocus.current = true
            void gameClient.command({
              type: 'room:settings',
              settings: { category: category as RoomSettings['category'] },
            })
          }}
        >
          <SelectTrigger id="category" ref={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!host && <p className="settings-hint">O administrador escolhe a categoria.</p>}
    </div>
  )
}
