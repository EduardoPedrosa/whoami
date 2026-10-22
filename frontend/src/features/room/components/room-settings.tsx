import { Label } from '@/components/ui/label'
import { gameClient } from '@/lib/game-client'
import { CATEGORIES, type RoomSettings, type RoomView } from '@whoami/shared'

export function Settings({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const host = room.selfId === room.hostId
  return (
    <div className="room-settings">
      <div>
        <Label htmlFor="category">Categoria</Label>
        <select
          id="category"
          value={room.settings.category}
          disabled={!host || disabled}
          onChange={(e) => {
            void gameClient.command({
              type: 'room:settings',
              settings: { category: e.target.value as RoomSettings['category'] },
            })
          }}
        >
          {CATEGORIES.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      {!host && <p className="settings-hint">O administrador escolhe a categoria.</p>}
    </div>
  )
}
