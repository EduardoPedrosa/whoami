import { WifiHigh, WifiSlash, ArrowsClockwise } from '@phosphor-icons/react'
import { useGame, gameClient } from '@/lib/game-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
export function ConnectionStatus() {
  const { connection, latency, pending } = useGame()
  const connected = connection === 'connected'
  return (
    <div
      className={cn('connection-status', !connected && 'connection-pending')}
      role="status"
      aria-live="polite"
    >
      {connected ? (
        <WifiHigh aria-hidden="true" size={16} />
      ) : (
        <WifiSlash aria-hidden="true" size={16} />
      )}
      <span>
        {connected
          ? pending
            ? 'Confirmando…'
            : 'Conectado'
          : connection === 'offline'
            ? 'Sem internet'
            : connection === 'replaced'
              ? 'Outra aba ativa'
              : 'Reconectando'}
      </span>
      {connected && latency !== null && (
        <span className="latency" title="Tempo de ida e volta até o servidor">
          {latency} ms
        </span>
      )}
    </div>
  )
}
export function ConnectionBanner() {
  const { connection, room, storageAvailable } = useGame()
  if (connection === 'connected' && storageAvailable) return null
  return (
    <div className="connection-banner" role="status">
      <ArrowsClockwise
        aria-hidden="true"
        className={cn(connection === 'reconnecting' && 'slow-spin')}
        size={20}
      />
      <div>
        <strong>
          {!storageAvailable
            ? 'Seu navegador bloqueou o armazenamento.'
            : connection === 'offline'
              ? 'A internet deu uma pausa.'
              : connection === 'replaced'
                ? 'Você abriu a partida em outra aba.'
                : 'Encontrando o caminho de volta…'}
        </strong>
        <p>
          {!storageAvailable
            ? 'Você pode jogar, mas recarregar a página pode perder sua sessão.'
            : connection === 'replaced'
              ? 'Continue por lá ou retome sua sessão aqui.'
              : room
                ? 'Seu lugar fica reservado por 2 minutos. Vamos sincronizar tudo ao reconectar.'
                : 'Conectando à mesa. Você poderá entrar assim que a conexão voltar.'}
        </p>
      </div>
      {connection === 'replaced' && (
        <Button variant="outline" size="sm" onClick={gameClient.reconnect}>
          Retomar aqui
        </Button>
      )}
    </div>
  )
}
