import { Label } from '@/components/ui/label'
import { gameClient } from '@/lib/game-client'
import { CATEGORIES, type RoomSettings, type RoomView } from '@whoami/shared'

export function Settings({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const host = room.selfId === room.hostId
  const change = (settings: RoomSettings) => {
    void gameClient.command({ type: 'room:settings', settings })
  }
  return (
    <div className="room-settings">
      <div>
        <Label htmlFor="category">Categoria</Label>
        <select
          id="category"
          value={room.settings.category}
          disabled={!host || disabled}
          onChange={(e) =>
            change({ ...room.settings, category: e.target.value as RoomSettings['category'] })
          }
        >
          {CATEGORIES.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="turn-seconds">Tempo por vez</Label>
        <select
          id="turn-seconds"
          value={room.settings.turnSeconds}
          disabled={!host || disabled}
          onChange={(e) =>
            change({
              ...room.settings,
              turnSeconds: Number(e.target.value) as RoomSettings['turnSeconds'],
            })
          }
        >
          <option value="60">1 minuto</option>
          <option value="90">1 min e 30 segundos</option>
          <option value="120">2 minutos</option>
          <option value="0">Sem cronômetro</option>
        </select>
      </div>
      {!host && (
        <p className="settings-hint">O anfitrião escolhe o universo e o tempo da rodada.</p>
      )}
    </div>
  )
}
